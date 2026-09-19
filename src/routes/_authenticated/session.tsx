import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, ShieldAlert } from "lucide-react";
import { Hydrated } from "@/components/AppFrame";
import { StepRenderer, type StepResult } from "@/components/steps";
import { bcp47, gamification, missionDays, onboarding } from "@/lib/content";
import {
  courseKey,
  isCheckpointLesson,
  lessonById,
  lessonIdFromKey,
  passThreshold,
} from "@/lib/course";
import { buildLessonSession, buildSession, stepLabel, type Step } from "@/lib/session";
import { Completion } from "@/components/Completion";
import { ShareCard } from "@/components/ShareCard";
import { useCompanion } from "@/lib/use-companion";
import { sfx } from "@/lib/sfx";
import { courseLessons } from "@/lib/course";
import { stopSpeaking } from "@/lib/speech";
import { useApp } from "@/lib/store";
import { dueCards } from "@/lib/srs";
import mascot from "@/assets/mascot-llama.png";

const TILE_TONE = {
  amber: "border-amber text-amber",
  primary: "border-primary text-primary",
  secondary: "border-secondary text-secondary",
} as const;

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: keyof typeof TILE_TONE;
}) {
  return (
    <div className={`rounded-2xl border-2 bg-card p-1 ${TILE_TONE[tone]}`}>
      <p className="hud py-1 text-center text-[9px]">{label}</p>
      <div className="rounded-xl bg-muted py-3">
        <p className="text-center text-lg font-extrabold">{value}</p>
      </div>
    </div>
  );
}

type Mode = "mission" | "review" | "checkpoint";

export const Route = createFileRoute("/_authenticated/session")({
  validateSearch: (s: Record<string, unknown>): { day: string; mode: Mode } => ({
    day: String(s['day'] ?? ""),
    mode: (["mission", "review", "checkpoint"].includes(String(s['mode'])) ? s['mode'] : "mission") as Mode,
  }),

  head: () => ({
    meta: [
      { title: "Lesson — Habla" },
      {
        name: "description",
        content: "Run drills, shadowing, dictation and spoken field interrogations in your target language.",
      },
      { property: "og:title", content: "Lesson — Habla" },
      { property: "og:description", content: "Zero-English drills, shadowing and spoken roleplay." },
    ],
  }),
  component: () => (
    <Hydrated>
      <SessionPage />
    </Hydrated>
  ),
});

function SessionPage() {
  const { day: dayKey, mode } = Route.useSearch();
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const cards = useApp((s) => s.cards);
  const seedCards = useApp((s) => s.seedCards);
  const reviewCard = useApp((s) => s.reviewCard);
  const completeSession = useApp((s) => s.completeSession);
  const { character } = useCompanion();

  const [index, setIndex] = useState(0);
  const [xp, setXp] = useState(0);
  const [right, setRight] = useState(0);
  const [graded, setGraded] = useState(0);
  const [cover, setCover] = useState(gamification.cover_integrity.starting_points_per_session as number);
  const [stsWins, setStsWins] = useState(0);
  const [mcqPerfect, setMcqPerfect] = useState(true);
  const [shadowReps, setShadowReps] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const [retried, setRetried] = useState<string[]>([]);
  const [passed, setPassed] = useState(true);
  const [threshold, setThreshold] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const lesson = useMemo(() => {
    const id = lessonIdFromKey(dayKey);
    return id ? lessonById(id) : undefined;
  }, [dayKey]);

  const days = profile ? missionDays(profile.langId) : [];
  const entry = lesson ? undefined : (days.find((d) => d.key === dayKey) ?? days[0]);
  const dueAtStart = useMemo(
    () => (profile ? dueCards(cards, profile.langId, 999).length : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.langId],
  );

  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    if (!profile) return;
    if (lesson) {
      setSteps(buildLessonSession({ lesson, cards, lang: profile.langId }));
    } else if (!entry) {
      return;
    } else if (mode === "review") {
      const reviews = dueCards(cards, profile.langId, 40).map((c) => ({ kind: "review", data: c }) as Step);
      setSteps(reviews);
    } else {
      setSteps(
        buildSession({
          day: entry.day,
          tierId: profile.tierId,
          cards,
          lang: profile.langId,
          checkpoint: mode === "checkpoint",
        }),
      );
    }
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, mode, profile?.langId, lesson?.id]);

  useEffect(() => {
    if (!profile) void navigate({ to: "/start" });
  }, [profile, navigate]);

  // A new target (or a re-run) starts a clean slate — the route stays mounted
  // when we hand off to the next lesson, so reset explicitly.
  const resetRun = () => {
    setIndex(0);
    setXp(0);
    setRight(0);
    setGraded(0);
    setCover(gamification.cover_integrity.starting_points_per_session as number);
    setStsWins(0);
    setMcqPerfect(true);
    setShadowReps(0);
    setRetried([]);
    setFinished(false);
    setCelebrate(false);
    setHandoff(false);
  };

  useEffect(() => {
    resetRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, mode]);

  // Seamless progression: the debrief never waits for a decision. A pass rolls
  // straight into the next file; a miss re-runs the same one.
  useEffect(() => {
    if (!finished || !celebrate) return;
    const t = setTimeout(() => {
      setCelebrate(false);
      setHandoff(true);
      const done = useApp.getState().completedDays;
      const next = courseLessons.find((l) => !done.includes(courseKey(l.id)));
      const go = setTimeout(() => {
        sfx("transition");
        if (!passed) {
          resetRun();
        } else if (!useApp.getState().streakCelebrated) {
          // First streak of their life — celebrate it before anything else.
          void navigate({ to: "/streak" });
        } else if (lesson) {
          // Straight into today's practice chat — apply what was just learned.
          void navigate({ to: "/simulate", search: { daily: lesson.id } });
        } else if (next) {
          void navigate({ to: "/session", search: { day: courseKey(next.id), mode: "mission" } });
        } else {
          void navigate({ to: "/dashboard" });
        }
      }, 2600);
      timers.current.push(go);
    }, 1900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, celebrate, passed]);


  if (!profile || (!entry && !lesson)) return null;


  const locale = bcp47(profile.langId);
  const tier = onboarding.daily_commitment_tiers.find((t) => t.id === profile.tierId);
  const step = steps[index];
  const total = steps.length;

  function handleDone(r: StepResult) {
    const s = steps[index]!;
    if (s.kind === "review")
      reviewCard(s.data.id, r.correct ? (r.hinted ? "hinted" : "correct") : "wrong");
    if (s.kind === "shadow") setShadowReps((n) => n + s.data.recommended_reps);
    if (s.kind === "sts" && r.correct) setStsWins((n) => n + 1);
    if (s.kind === "mcq" && !r.correct) setMcqPerfect(false);
    sfx(r.countsForAccuracy ? (r.correct ? "correct" : "wrong") : "transition");

    let nextCover = cover;
    if (!r.correct && r.newContent) {
      nextCover = Math.max(0, cover - gamification.cover_integrity.cost_on_wrong_new_content_answer);
      setCover(nextCover);
    }

    setXp((v) => v + r.xp);
    if (r.countsForAccuracy) {
      setGraded((g) => g + 1);
      if (r.correct) setRight((c) => c + 1);
    }

    let remaining = steps.slice(index + 1);

    // Manifest rule `wrong_answer: same_session_and_next_day` — a missed graded
    // activity returns once more at the end of the same run.
    const retryId =
      !r.correct && r.countsForAccuracy && "act" in s && s.act ? s.act.id : null;
    if (retryId && !retried.includes(retryId)) {
      setRetried((ids) => [...ids, retryId]);
      remaining = [...remaining, s];
      setSteps([...steps.slice(0, index + 1), ...remaining]);
    }
    // Cover integrity at zero: restrict the rest of the session to review/shadowing.
    // Course lessons are never truncated — the learner needs the whole briefing.
    if (!lesson && nextCover === 0 && cover > 0) {
      remaining = remaining.filter((x) => x.kind === "review" || x.kind === "shadow");
      setSteps([...steps.slice(0, index + 1), ...remaining]);
    }
    if (remaining.length === 0) finish(xp + r.xp, graded + (r.countsForAccuracy ? 1 : 0), right + (r.correct && r.countsForAccuracy ? 1 : 0), nextCover);
    else {
      setIndex(index + 1);
      setTimeout(() => sfx("transition"), 90);
    }
  }

  function finish(finalXp: number, finalGraded: number, finalRight: number, finalCover: number) {
    stopSpeaking();
    const accuracy = finalGraded === 0 ? 1 : finalRight / finalGraded;
    const perfect = finalGraded > 0 && finalRight === finalGraded;
    const threshold = lesson
      ? passThreshold(lesson.id)
      : mode === "checkpoint"
        ? 0.8
        : 0;
    const passedRun = finalGraded === 0 ? true : accuracy >= threshold;
    const bonus =
      (lesson ? isCheckpointLesson(lesson.id) : mode === "checkpoint") && passedRun
        ? (gamification.xp_rules.checkpoint_passed_bonus as number)
        : 0;
    const awarded = Math.round(
      (finalXp + bonus) * (perfect ? (gamification.xp_rules.perfect_session_multiplier as number) : 1),
    );

    if (lesson) {
      seedCards(
        lesson.vocabulary.map((v) => ({ id: `${lesson.id}:${v.id}`, target: v.es, translation: v.en })),
        profile!.langId,
      );
    } else if (mode !== "review") {
      seedCards(entry!.day.new_items, profile!.langId);
    }

    const minutes = (Date.now() - startedAt) / 60000;
    completeSession(
      {
        date: Date.now(),
        dayKey: lesson ? courseKey(lesson.id) : mode === "review" ? "review" : entry!.key,

        xp: awarded,
        accuracy,
        items: finalGraded,
        coverIntact: finalCover === (gamification.cover_integrity.starting_points_per_session as number),
        passed: passedRun,
      },
      {
        quest_sts_2: stsWins >= 2,
        quest_perfect_drill: mcqPerfect && steps.some((s) => s.kind === "mcq"),
        quest_clear_vault: dueAtStart > 0 && dueCards(useApp.getState().cards, profile!.langId, 999).length === 0,
        quest_shadow_5: shadowReps >= 5,
        quest_beat_clock: minutes <= (tier?.minutes ?? 30),
      },
    );
    setXp(awarded);
    setPassed(passedRun);
    setThreshold(threshold);
    setFinished(true);
    setCelebrate(true);
  }

  if (finished) {
    const accuracy = graded === 0 ? 1 : right / graded;
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    const accuracyPct = Math.round(accuracy * 100);

    return (
      <div className="topo mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-5 py-8">
        <div className="flex flex-col items-center text-center">
          <img
            src={mascot}
            alt="Habla mascot celebrating"
            className="seal-in h-40 w-40 object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.18)]"
          />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-amber">
            {passed ? "You're a learner!" : "Almost there!"}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {passed ? "I'm proud of you already!!" : "Run it back — your XP is already banked."}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2.5">
          <StatTile label="TOTAL XP" value={`${xp}`} tone="amber" />
          <StatTile label="ACCURACY" value={`${accuracyPct}%`} tone="primary" />
          <StatTile label="SPEEDY" value={clock} tone="secondary" />
        </div>

        <p className="hud mt-4 text-center text-[10px] text-muted-foreground">
          {graded} QUESTIONS · {cover}/5 HEARTS LEFT
          {threshold > 0 ? ` · PASS ${Math.round(threshold * 100)}%` : ""}
        </p>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {passed
            ? "Anything you missed goes into your practice deck and comes back later."
            : `Below the ${Math.round(threshold * 100)}% pass mark, so let\u2019s run it again right now — no penalty.`}
        </p>

        {handoff && (
          <p className="hud mt-4 flex items-center justify-center gap-2 text-[10px] text-secondary">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-secondary" />
            {passed
              ? lesson
                ? "OPENING PRACTICE CHAT…"
                : "LOADING THE NEXT LESSON…"
              : "STARTING IT AGAIN…"}
          </p>
        )}

        <div className="mt-6">
          <ShareCard
            stats={{
              title: lesson ? lesson.title : "Daily lesson",
              flag: character?.flag ?? "🇪🇸",
              seconds,
              accuracy,
              crimes: Math.max(0, graded - right),
              xp,
              tutor: character?.name ?? "the tutor",
            }}
          />
        </div>

        <button
          onClick={() => {
            timers.current.forEach(clearTimeout);
            sfx("transition");
            void navigate(
              useApp.getState().streakCelebrated ? { to: "/dashboard" } : { to: "/streak" },
            );
          }}
          className="hud mt-4 rounded-2xl bg-primary py-4 text-center text-xs text-primary-foreground shadow-[0_5px_0_-1px_color-mix(in_oklab,var(--primary)_60%,black)] active:translate-y-[2px] active:shadow-none"
        >
          CLAIM {xp} XP
        </button>

        {celebrate && (
          <Completion
            title={passed ? "Lesson complete!" : "Almost there!"}
            subtitle={`+${xp} XP`}
            tone={passed ? "levelup" : "complete"}
            duration={1800}
          />
        )}
      </div>
    );
  }


  if (!step) {
    return (
      <div className="topo mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center gap-4 px-5">
        <p className="hud text-center text-xs text-muted-foreground">
          Nothing to review right now — you\u2019re all caught up!
        </p>
        <Link to="/dashboard" className="hud rounded-sm border border-border px-5 py-3 text-[10px]">
          BACK TO MAP
        </Link>
      </div>
    );
  }

  return (
    <div className="topo mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate({ to: "/dashboard" })} aria-label="Leave lesson">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="min-w-0">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.round((index / total) * 100)}%` }}
            />
          </div>
        </div>
        <span className="hud flex items-center gap-1 text-[11px] text-destructive">
          <ShieldAlert className="h-3.5 w-3.5" />
          {cover}
        </span>
      </header>

      <main className="flex-1 px-4 pb-8 pt-4">
        <p className="hud text-[10px] text-secondary">
          {stepLabel(step.kind)} · {index + 1}/{total}
        </p>
        <div className="mt-4">
          <div key={index} className="step-in">
          <StepRenderer step={step} locale={locale} onDone={handleDone} />
        </div>
        </div>
      </main>
    </div>
  );
}
