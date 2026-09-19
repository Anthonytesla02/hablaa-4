import { createFileRoute } from "@tanstack/react-router";

/**
 * Neural text-to-speech, generated once and shared by everyone.
 *
 * - Every request is keyed by voice + speed + text. A hit is served straight
 *   from the shared cache with no AI call at all.
 * - Course phrases are cached forever and free to replay for any user.
 * - Anything that is NOT authored course content requires a signed-in user and
 *   counts against that user's daily budget, so the endpoint cannot be used as
 *   an open text-to-speech service.
 * - The voice, speed and voice instructions are decided server-side, so two
 *   users asking for the same phrase always share one cached recording.
 */

const MODEL = "openai/gpt-4o-mini-tts";
const VOICES = {
  ash: "Young man in his early twenties, relaxed and friendly, natural conversational pace.",
  shimmer: "Warm, friendly young woman, natural conversational pace.",
} as const;
type VoiceId = keyof typeof VOICES;

const MAX_COURSE_CHARS = 1200;
const MAX_DYNAMIC_CHARS = 400;

/** Collapses simultaneous first-time requests for the same phrase into one call. */
const inFlight = new Map<string, Promise<ArrayBuffer | null>>();

function audioResponse(bytes: ArrayBuffer, cached: boolean) {
  return new Response(bytes, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Cache": cached ? "HIT" : "MISS",
    },
  });
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as
          | { text?: string; voice?: string; speed?: number }
          | null;

        const rawText = (body?.text ?? "").replace(/\s+/g, " ").trim();
        if (!rawText) return new Response("Missing text", { status: 400 });

        const voice: VoiceId = body?.voice === "ash" ? "ash" : "shimmer";
        // Quantised so tiny rate differences don't each mint their own recording.
        const speed = Math.round(Math.min(1.4, Math.max(0.7, body?.speed ?? 1)) * 10) / 10;

        const [{ hashKey, getCachedSpeech, putCachedSpeech, requireQuota, QuotaExceeded }, { isCourseText }] =
          await Promise.all([
            import("@/lib/shared-cache.server"),
            import("@/lib/course-text.server"),
          ]);

        const fromCourse = isCourseText(rawText);
        const limit = fromCourse ? MAX_COURSE_CHARS : MAX_DYNAMIC_CHARS;
        const text = rawText.slice(0, limit);

        const cacheKey = await hashKey("tts-v1", MODEL, voice, speed, text);

        const cached = await getCachedSpeech(cacheKey);
        if (cached) return audioResponse(cached, true);

        // Cache miss: only now does anything cost money, so gate it.
        if (!fromCourse) {
          const { userIdFromRequest } = await import("@/lib/request-auth.server");
          const userId = await userIdFromRequest(request);
          if (!userId) return new Response("Sign in required", { status: 401 });
          try {
            await requireQuota(userId, "tts_dynamic");
          } catch (error) {
            if (error instanceof QuotaExceeded) {
              return new Response(error.message, { status: 429 });
            }
            throw error;
          }
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("TTS unavailable", { status: 503 });

        let pending = inFlight.get(cacheKey);
        if (!pending) {
          pending = (async () => {
            const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: MODEL,
                input: text,
                voice,
                speed,
                instructions: VOICES[voice],
                response_format: "mp3",
                stream_format: "audio",
              }),
            });
            if (!res.ok) return null;
            const bytes = await res.arrayBuffer();
            if (bytes.byteLength < 512) return null;
            await putCachedSpeech(cacheKey, bytes, { voice, speed, text });
            return bytes;
          })().finally(() => inFlight.delete(cacheKey));
          inFlight.set(cacheKey, pending);
        }

        const bytes = await pending;
        if (!bytes) return new Response("TTS failed", { status: 502 });
        return audioResponse(bytes, false);
      },
    },
  },
});
