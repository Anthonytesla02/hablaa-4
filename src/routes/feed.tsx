import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Loader2, Share2, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deletePost, listFeed, postShareText, sharePlainText, type FeedPost } from "@/lib/feed";
import { sfx } from "@/lib/sfx";

export const Route = createFileRoute("/feed")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Community Feed — Habla" },
      {
        name: "description",
        content:
          "See streaks and simulation results posted by other Habla learners, and share your own wins in one tap.",
      },
      { property: "og:title", content: "Community Feed — Habla" },
      {
        property: "og:description",
        content: "Streaks, accuracy scores and grammar crimes from learners practising Spanish out loud.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedPage,
  errorComponent: () => (
    <Shell>
      <p className="mt-10 text-center text-sm text-muted-foreground">
        The feed could not load right now. Pull it up again in a moment.
      </p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="mt-10 text-center text-sm text-muted-foreground">Nothing here.</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="topo mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-10 pt-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Community feed</h1>
        <Link
          to="/dashboard"
          className="rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-extrabold text-primary"
        >
          My map
        </Link>
      </header>
      {children}
    </div>
  );
}

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function FeedPage() {
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["feed"],
    queryFn: () => listFeed(),
    refetchOnWindowFocus: true,
  });

  async function share(p: FeedPost) {
    sfx("tap");
    const res = await sharePlainText(postShareText(p));
    if (res === "copied") toast.success("Copied — paste it anywhere");
    if (res === "failed") toast.error("Sharing isn’t available on this device");
  }

  async function remove(p: FeedPost) {
    sfx("tap");
    try {
      await deletePost(p.id);
      await qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Post removed");
    } catch {
      toast.error("Could not remove that post");
    }
  }

  return (
    <Shell>
      <p className="mt-1 text-xs text-muted-foreground">
        Streaks and simulation results from learners like you. Post yours from the profile page or after
        any lesson or scene.
      </p>

      {isLoading && (
        <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the feed…
        </p>
      )}
      {isError && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          The feed could not load. Try again in a moment.
        </p>
      )}

      {data && data.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Nobody has posted yet — be the first to show off a streak.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {(data ?? []).map((p) => {
          const s = p.stats;
          return (
            <li key={p.id} className="rounded-3xl border-2 border-border/70 bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-extrabold">
                  {s.flag ?? "🇪🇸"} {p.callsign}
                </p>
                <span className="shrink-0 text-[10px] font-bold text-muted-foreground">
                  {ago(p.created_at)}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">
                {p.kind === "streak" ? "Streak update" : s.title ?? "Simulation result"}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                {p.kind === "streak" ? (
                  <>
                    {s.streak != null && (
                      <Chip>
                        <Flame className="h-3 w-3" /> {s.streak}-day streak
                      </Chip>
                    )}
                    {s.level && <Chip>🎖 {s.level}</Chip>}
                    {s.xp != null && (
                      <Chip>
                        <Trophy className="h-3 w-3" /> {s.xp} XP
                      </Chip>
                    )}
                  </>
                ) : (
                  <>
                    {s.seconds != null && <Chip>⏱ {mmss(s.seconds)}</Chip>}
                    {s.accuracy != null && <Chip>🔥 {Math.round(s.accuracy * 100)}%</Chip>}
                    {s.crimes != null && <Chip>💀 {s.crimes}</Chip>}
                    {s.xp != null && <Chip>🏆 {s.xp} XP</Chip>}
                  </>
                )}
              </div>

              {p.body && <p className="mt-3 text-[13px] leading-relaxed">{p.body}</p>}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void share(p)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary/10 py-2.5 text-[11px] font-extrabold text-primary"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
                {me === p.user_id && (
                  <button
                    onClick={() => void remove(p)}
                    aria-label="Delete post"
                    className="rounded-2xl border-2 border-border/70 px-3 text-muted-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">{children}</span>
  );
}
