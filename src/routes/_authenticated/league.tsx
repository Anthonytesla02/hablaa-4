import { createFileRoute } from "@tanstack/react-router";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { gamification } from "@/lib/content";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/league")({
  head: () => ({
    meta: [
      { title: "Weekly League — Habla" },
      {
        name: "description",
        content: "Weekly cell standings against AI-paced ghost operatives, ranked by XP earned.",
      },
      { property: "og:title", content: "Weekly League — Habla" },
      { property: "og:description", content: "Track your weekly XP standings in your operative cell." },
    ],
  }),
  component: () => (
    <Hydrated>
      <LeaguePage />
    </Hydrated>
  ),
});

const GHOST_NAMES = [
  "VESPER", "KESTREL", "MERIDIAN", "HALCYON", "DRIFTWOOD", "NIGHTJAR",
  "SABLE", "CORMORANT", "LANTERN", "ORACLE", "TANAGER",
];

function LeaguePage() {
  const weeklyXp = useApp((s) => s.weeklyXp);
  const seed = useApp((s) => s.ghostSeed);
  const tier = useApp((s) => s.leagueTier);
  const profile = useApp((s) => s.profile);

  const rank = (gamification.league_ranks as { tier: number; name: string }[]).find(
    (r) => r.tier === tier,
  );

  const ghosts = GHOST_NAMES.map((name, i) => ({
    name,
    xp: Math.round(((seed * (i + 3)) % 260) * 4 + i * 37 + 40),
  }));

  const board = [...ghosts, { name: (profile?.callsign ?? "YOU").toUpperCase(), xp: weeklyXp }].sort(
    (a, b) => b.xp - a.xp,
  );
  const me = board.findIndex((r) => r.xp === weeklyXp && r.name === (profile?.callsign ?? "YOU").toUpperCase());

  return (
    <AppFrame>
      <h1 className="hud text-lg">{rank?.name ?? "Sprouts"}</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Top 3 promote · bottom 3 demote at week's end. Opponents are AI-paced ghost operatives —
        live multiplayer needs a server.
      </p>

      <ol className="mt-5 space-y-1.5">
        {board.map((r, i) => {
          const isMe = i === me;
          return (
            <li
              key={r.name}
              className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border px-3 py-2.5 ${
                isMe ? "border-primary bg-primary/10" : "border-border bg-card"
              } ${i < 3 ? "border-l-4 border-l-secondary" : ""}`}
            >
              <span className="hud w-5 text-[11px] text-muted-foreground">{i + 1}</span>
              <span className="hud truncate text-[11px]">{r.name}</span>
              <span className="hud shrink-0 text-[11px] text-primary">{r.xp} XP</span>
            </li>
          );
        })}
      </ol>
    </AppFrame>
  );
}
