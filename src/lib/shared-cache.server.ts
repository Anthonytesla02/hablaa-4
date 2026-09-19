/**
 * Universal server-side cache shared by every user.
 *
 * - Generated speech (mp3) lives in the private `tts-cache` storage bucket and
 *   is indexed by `public.tts_cache`.
 * - Deterministic AI lookups (word glosses, utterance clean-ups) live in
 *   `public.ai_cache`.
 * - Per-user daily budgets for the calls that genuinely cannot be cached live
 *   in `public.ai_usage`, enforced by the atomic `consume_ai_quota` function.
 *
 * All three tables have RLS on with no policies, so they are only reachable
 * from this trusted server code — never from the browser.
 */

export const TTS_BUCKET = "tts-cache";

/** Stable cache key. Same inputs from any user hit the same row. */
export async function hashKey(...parts: (string | number)[]): Promise<string> {
  const data = new TextEncoder().encode(parts.join("\u0000"));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ── Speech cache ─────────────────────────────────────────────────── */

/** Cached mp3 bytes for this key, or null when nothing has been generated yet. */
export async function getCachedSpeech(cacheKey: string): Promise<ArrayBuffer | null> {
  try {
    const db = await admin();
    const { data: row } = await db
      .from("tts_cache")
      .select("storage_path")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (!row?.storage_path) return null;

    const { data: file, error } = await db.storage.from(TTS_BUCKET).download(row.storage_path);
    if (error || !file) return null;
    await db.rpc("touch_tts_cache", { _cache_key: cacheKey });
    return await file.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Store freshly generated speech for everyone. Upload + insert are both
 * idempotent, so simultaneous first-time requests for the same phrase settle
 * on one shared object instead of fighting.
 */
export async function putCachedSpeech(
  cacheKey: string,
  bytes: ArrayBuffer,
  meta: { voice: string; speed: number; text: string },
): Promise<void> {
  try {
    const db = await admin();
    const storagePath = `${cacheKey.slice(0, 2)}/${cacheKey}.mp3`;
    const { error: upErr } = await db.storage.from(TTS_BUCKET).upload(storagePath, bytes, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    if (upErr) return;
    await db.from("tts_cache").upsert(
      {
        cache_key: cacheKey,
        storage_path: storagePath,
        voice: meta.voice,
        speed: meta.speed,
        text_preview: meta.text.slice(0, 120),
        byte_size: bytes.byteLength,
      },
      { onConflict: "cache_key", ignoreDuplicates: true },
    );
  } catch {
    /* caching is best-effort; never fail the request over it */
  }
}

/* ── JSON cache for deterministic AI lookups ──────────────────────── */

/**
 * Run `produce` only when no user has ever asked for this exact input before;
 * otherwise reuse the stored answer.
 */
export async function cachedJson<T>(
  feature: string,
  cacheKey: string,
  produce: () => Promise<T | null>,
): Promise<T | null> {
  let db: Awaited<ReturnType<typeof admin>> | null = null;
  try {
    db = await admin();
    const { data: row } = await db
      .from("ai_cache")
      .select("payload")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (row?.payload) {
      await db.rpc("touch_ai_cache", { _cache_key: cacheKey });
      return row.payload as T;
    }
  } catch {
    /* fall through to a live call */
  }

  const fresh = await produce();
  if (fresh == null) return null;

  try {
    if (db) {
      await db
        .from("ai_cache")
        .upsert(
          { cache_key: cacheKey, feature, payload: fresh as never },
          { onConflict: "cache_key", ignoreDuplicates: true },
        );
    }
  } catch {
    /* best-effort */
  }
  return fresh;
}

/* ── Per-user daily budgets ───────────────────────────────────────── */

/** Daily ceilings for calls that cannot be shared between users. */
export const DAILY_LIMITS = {
  /** Live role-play turns. */
  simulate: 400,
  /** Mistake grading inside role-play. */
  coach: 400,
  /** Pronunciation scoring (audio upload). */
  pronounce: 300,
  /** Speech generated for text that is not part of the course content. */
  tts_dynamic: 300,
  /** First-time word look-ups (cache misses only). */
  gloss: 300,
  /** First-time utterance clean-ups (cache misses only). */
  translate: 300,
} as const;

export type QuotaFeature = keyof typeof DAILY_LIMITS;

export class QuotaExceeded extends Error {
  constructor(feature: QuotaFeature) {
    super(`Daily limit reached for ${feature}. Try again tomorrow.`);
    this.name = "QuotaExceeded";
  }
}

/** Atomically count one use. Returns false once the user is over budget. */
export async function withinQuota(userId: string, feature: QuotaFeature): Promise<boolean> {
  try {
    const db = await admin();
    const { data, error } = await db.rpc("consume_ai_quota", {
      _user_id: userId,
      _feature: feature,
      _limit: DAILY_LIMITS[feature],
    });
    if (error) return true; // never lock users out because bookkeeping failed
    return data !== false;
  } catch {
    return true;
  }
}

/** Throws when the signed-in user has used up today's budget. */
export async function requireQuota(userId: string, feature: QuotaFeature): Promise<void> {
  if (!(await withinQuota(userId, feature))) throw new QuotaExceeded(feature);
}
