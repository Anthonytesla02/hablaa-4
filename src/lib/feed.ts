import { supabase } from "@/integrations/supabase/client";

export type FeedStats = {
  flag?: string;
  title?: string;
  seconds?: number;
  accuracy?: number;
  crimes?: number;
  xp?: number;
  tutor?: string;
  streak?: number;
  longest?: number;
  level?: string;
};

export type FeedPost = {
  id: string;
  user_id: string;
  callsign: string;
  kind: "streak" | "simulation";
  body: string;
  stats: FeedStats;
  created_at: string;
};

export async function listFeed(limit = 60): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from("feed_posts")
    .select("id,user_id,callsign,kind,body,stats,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    kind: r.kind === "simulation" ? "simulation" : "streak",
    stats: (r.stats ?? {}) as FeedStats,
  })) as FeedPost[];
}

export async function createPost(input: {
  kind: "streak" | "simulation";
  body: string;
  stats: FeedStats;
  callsign: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Sign in to post");
  const { error } = await supabase.from("feed_posts").insert({
    user_id: user.id,
    callsign: input.callsign || "Learner",
    kind: input.kind,
    body: input.body.slice(0, 240),
    stats: input.stats as never,
  });
  if (error) throw error;
}

export async function deletePost(id: string) {
  const { error } = await supabase.from("feed_posts").delete().eq("id", id);
  if (error) throw error;
}

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** Plain-text version of a post, used for sharing / copying. */
export function postShareText(p: FeedPost) {
  const s = p.stats;
  const lines = [`${s.flag ?? "🇪🇸"} ${p.callsign} — ${s.title ?? "Habla"}`];
  if (p.kind === "streak") {
    if (s.streak != null) lines.push(`🔥 ${s.streak}-day streak${s.longest ? ` (best ${s.longest})` : ""}`);
    if (s.level) lines.push(`🎖 ${s.level}`);
    if (s.xp != null) lines.push(`🏆 ${s.xp} XP`);
  } else {
    if (s.seconds != null) lines.push(`⏱ ${mmss(s.seconds)} survived`);
    if (s.accuracy != null) lines.push(`🔥 ${Math.round(s.accuracy * 100)}% accuracy`);
    if (s.crimes != null) lines.push(`💀 ${s.crimes} grammar crime${s.crimes === 1 ? "" : "s"}`);
    if (s.xp != null) lines.push(`🏆 ${s.xp} XP`);
  }
  if (p.body) lines.push("", p.body);
  return lines.join("\n");
}

/** Native share sheet with clipboard fallback. Resolves true when copied. */
export async function sharePlainText(text: string): Promise<"shared" | "copied" | "failed"> {
  const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
  try {
    if (nav.share) {
      await nav.share({ text });
      return "shared";
    }
  } catch {
    /* cancelled — fall through */
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
