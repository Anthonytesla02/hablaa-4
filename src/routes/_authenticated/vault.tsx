import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Brain, ChevronRight, Eye, Check, RotateCcw, Layers, Zap } from "lucide-react";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { PlayButton } from "@/components/Audio";
import { Glossed } from "@/components/Glossed";
import { arcTitle, bcp47, missionDays } from "@/lib/content";
import { courseKey, courseLessons, hasCourse } from "@/lib/course";

import { Completion } from "@/components/Completion";
import { handlerReact, handlerSay } from "@/lib/handler-bus";
import { useApp } from "@/lib/store";
import type { SrsCard } from "@/lib/srs";

export const Route = createFileRoute("/_authenticated/vault")({
  validateSearch: (s: Record<string, unknown>): { day: string } => ({
    day: String(s['day'] ?? ""),
  }),
  head: () => ({
    meta: [
      { title: "Practice Deck — Habla" },
      {
        name: "description",
        content:
          "Quiz-style active recall: one item at a time, recall it from memory, self-grade and bank XP. Scheduled by a modified SM-2 engine.",
      },
      { property: "og:title", content: "Practice Deck — Habla" },
      {
        property: "og:description",
        content: "One-card-at-a-time recall drills with XP, combos and spaced-repetition scheduling.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Hydrated>
      <VaultPage />
    </Hydrated>
  ),
});

type Deck = {
  id: string;
  label: string;
  sub: string;
  cards: SrsCard[];
  due: number;
};

function VaultPage() {
  const navigate = useNavigate();
  const { day } = Route.useSearch();
  const profile = useApp((s) => s.profile);
  const cards = useApp((s) => s.cards);
  const completedDays = useApp((s) => s.completedDays);

  useEffect(() => {
    if (!profile) void navigate({ to: "/start" });
  }, [profile, navigate]);

  const [runId, setRunId] = useState<string | null>(null);

  const decks: Deck[] = useMemo(() => {
    if (!profile) return [];
    const mine = Object.values(cards).filter((c) => c.lang === profile.langId);
    const byId = new Map(mine.map((c) => [c.id, c]));
    const now = Date.now();
    const out: Deck[] = [];

    const due = mine.filter((c) => c.dueAt <= now);
    if (due.length > 0) {
      out.push({
        id: "due",
        label: "DUE NOW",
        sub: "Everything the schedule says you're about to forget",
        cards: due.sort((a, b) => a.dueAt - b.dueAt),
        due: due.length,
      });
    }

    for (const lesson of hasCourse(profile.langId) ? courseLessons : []) {
      const deckCards = lesson.vocabulary
        .map((v) => byId.get(`${lesson.id}:${v.id}`))
        .filter((c): c is SrsCard => Boolean(c));
      if (deckCards.length === 0) continue;
      out.push({
        id: courseKey(lesson.id),
        label: lesson.title,
        sub: `Week ${lesson.week} · Day ${lesson.day} · ${lesson.focus}`,
        cards: deckCards,
        due: deckCards.filter((c) => c.dueAt <= now).length,
      });
    }

    for (const entry of missionDays(profile.langId)) {
      const deckCards = entry.day.new_items
        .map((it) => byId.get(it.id))
        .filter((c): c is SrsCard => Boolean(c));
      if (deckCards.length === 0) continue;
      out.push({
        id: entry.key,
        label: entry.day.theme,
        sub: `${arcTitle(entry.arcId)} · Day ${entry.day.day_number}`,
        cards: deckCards,
        due: deckCards.filter((c) => c.dueAt <= now).length,
      });
    }


    if (mine.length > 0) {
      out.push({
        id: "all",
        label: "FULL DECK",
        sub: "Every item you've ever filed, shuffled",
        cards: [...mine].sort(() => Math.random() - 0.5),
        due: mine.filter((c) => c.dueAt <= now).length,
      });
    }
    return out;
  }, [cards, profile]);

  // Deep link from the map: /vault?day=arc_1:day_2 starts that checkpoint drill.
  useEffect(() => {
    if (day && decks.some((d) => d.id === day)) setRunId(day);
  }, [day, decks]);

  if (!profile) return null;
  const locale = bcp47(profile.langId);
  const active = decks.find((d) => d.id === runId);

  if (active) {
    return (
      <RecallRun
        deck={active}
        locale={locale}
        onExit={() => {
          setRunId(null);
          if (day) void navigate({ to: "/vault", search: { day: "" } });
        }}
      />
    );
  }

  const total = Object.values(cards).filter((c) => c.lang === profile.langId).length;
  const dueTotal = decks.find((d) => d.id === "due")?.due ?? 0;

  return (
    <AppFrame>
      <h1 className="hud text-lg">Practice deck</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {total} items filed · {dueTotal} due now · active recall, one item at a time
      </p>

      <ul className="mt-5 space-y-2">
        {decks.map((d) => (
          <li key={d.id}>
            <button
              onClick={() => {
                setRunId(d.id);
                handlerReact("recallStart", "nudge");
              }}
              className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border border-border bg-card px-3 py-3 text-left transition-colors hover:border-primary"
            >
              <span className="shrink-0">
                {d.id === "due" ? (
                  <Zap className="h-4 w-4 text-destructive" />
                ) : d.id === "all" ? (
                  <Layers className="h-4 w-4 text-secondary" />
                ) : (
                  <Brain className="h-4 w-4 text-primary" />
                )}
              </span>
              <span className="min-w-0">
                <span className="hud block text-[9px] text-muted-foreground">{d.sub}</span>
                <span className="block truncate text-sm">{d.label}</span>
                <span className="hud mt-1 block text-[9px] text-muted-foreground">
                  {d.cards.length} ITEMS{d.due > 0 ? ` · ${d.due} DUE` : ""}
                  {completedDays.includes(d.id) ? " · CHECKPOINT CLEARED" : ""}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
        {decks.length === 0 && (
          <li className="paper-card p-4 text-sm">
            Nothing filed yet. Complete a mission day and every item you touch lands here as a recall
            drill.
          </li>
        )}
      </ul>

      <Link
        to="/dashboard"
        className="hud mt-6 block rounded-sm border border-border py-3 text-center text-[10px] text-muted-foreground"
      >
        BACK TO MAP
      </Link>
    </AppFrame>
  );
}

/* ── Quiz-style recall runner ─────────────────────────────────────────── */
function RecallRun({
  deck,
  locale,
  onExit,
}: {
  deck: Deck;
  locale: string;
  onExit: () => void;
}) {
  const reviewCard = useApp((s) => s.reviewCard);
  const addXp = useApp((s) => s.addXp);

  const queue = useMemo(() => deck.cards.slice(0, 25), [deck]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [points, setPoints] = useState(0);
  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [done, setDone] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const card = queue[i];

  function grade(correct: boolean) {
    if (!card) return;
    reviewCard(card.id, correct);
    let gained = 0;
    if (correct) {
      const nextCombo = combo + 1;
      gained = 6 + Math.min(6, (nextCombo - 1) * 2);
      setCombo(nextCombo);
      setBest((b) => Math.max(b, nextCombo));
      setHits((h) => h + 1);
      if (nextCombo === 3) handlerReact("streak3", "hype");
      else if (nextCombo === 5) handlerReact("streak5", "hype");
      else if (nextCombo % 7 === 0) handlerReact("correct", "proud");
    } else {
      setCombo(0);
      handlerReact("wrong", "tough");
    }
    const nextPoints = points + gained;
    setPoints(nextPoints);
    setRevealed(false);

    if (i + 1 >= queue.length) {
      addXp(nextPoints);
      handlerReact("recallDone", "proud");
      setDone(true);
      setCelebrate(true);
    } else {
      setI(i + 1);
    }
  }

  if (done) {
    const accuracy = queue.length === 0 ? 0 : Math.round((hits / queue.length) * 100);
    return (
      <AppFrame tabs={false}>
        {celebrate && (
          <Completion
            title="Practice complete!"
            subtitle={`+${points} XP banked · ${accuracy}% recalled`}
            onDone={() => setCelebrate(false)}
          />
        )}
        <div className="paper-card p-5">
          <p className="stamp stamp-in inline-block text-destructive">Nice practice!</p>
          <h1 className="hud mt-4 text-lg">RECALL REPORT</h1>
          <dl className="hud mt-4 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <dt>POINTS BANKED</dt>
              <dd className="text-primary">+{points} XP</dd>
            </div>
            <div className="flex justify-between">
              <dt>RECALLED</dt>
              <dd>
                {hits}/{queue.length} · {accuracy}%
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>BEST COMBO</dt>
              <dd>{best}x</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm">
            Items you recalled cleanly stretched their intervals. Misses come back within a day.
          </p>
        </div>
        <button
          onClick={onExit}
          className="hud mt-4 w-full rounded-sm bg-primary py-3.5 text-xs text-primary-foreground"
        >
          Back to practice
        </button>
      </AppFrame>
    );
  }

  if (!card) {
    return (
      <AppFrame tabs={false}>
        <p className="hud text-center text-xs text-muted-foreground">Nothing here yet.</p>
        <button
          onClick={onExit}
          className="hud mt-4 w-full rounded-sm border border-border py-3 text-[10px]"
        >
          BACK
        </button>
      </AppFrame>
    );
  }

  return (
    <AppFrame tabs={false}>
      <div className="flex items-center justify-between gap-3">
        <button onClick={onExit} className="hud text-[10px] text-muted-foreground">
          ✕ EXIT
        </button>
        <p className="hud text-[10px] text-secondary">
          {i + 1}/{queue.length} · {points} PTS{combo >= 2 ? ` · ${combo}x` : ""}
        </p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.round((i / queue.length) * 100)}%` }}
        />
      </div>

      <p className="hud mt-5 text-[10px] text-muted-foreground">
        ACTIVE RECALL · {deck.label.toUpperCase()}
      </p>

      <div className="paper-card mt-3 p-4">
        <p className="hud text-[9px] text-destructive">Say it out loud</p>
        <p className="mt-2 text-xl leading-snug">{card.translation}</p>

        {revealed ? (
          <div className="mt-4 border-t border-border/70 pt-3">
            <p className="text-lg">
              <Glossed text={card.target} locale={locale} />
            </p>
            <div className="mt-3">
              <PlayButton text={card.target} locale={locale} label="HEAR IT" />
            </div>
            <span className="hud mt-3 block text-[9px] text-muted-foreground">
              EF {card.ease.toFixed(2)} · {card.reps} REPS · {card.lapses}L
            </span>
          </div>
        ) : (
          <p className="mt-4 text-[11px] italic text-muted-foreground">
            Answer out loud first — then reveal and grade yourself honestly.
          </p>
        )}
      </div>

      {revealed ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => grade(false)}
            className="hud rounded-sm border border-destructive/60 bg-destructive/10 py-3.5 text-[11px] text-destructive"
          >
            <RotateCcw className="mr-1 inline h-3.5 w-3.5" /> MISSED
          </button>
          <button
            onClick={() => grade(true)}
            className="hud rounded-sm bg-primary py-3.5 text-[11px] text-primary-foreground"
          >
            <Check className="mr-1 inline h-3.5 w-3.5" /> GOT IT
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setRevealed(true);
            if (i === 0) handlerSay("No peeking early — recall first, then check.", "nudge");
          }}
          className="hud mt-4 w-full rounded-sm border border-secondary/60 bg-secondary/10 py-3.5 text-[11px] text-secondary"
        >
          <Eye className="mr-1 inline h-3.5 w-3.5" /> REVEAL ANSWER
        </button>
      )}
    </AppFrame>
  );
}
