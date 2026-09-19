import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Star, Check, Target, Brain, Crown, Radio, Flag, CheckCircle2, CalendarCheck, Sparkles } from "lucide-react";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { arcTitle, langById, missionDays, onboarding } from "@/lib/content";
import {
  challengeForDay,
  courseKey,
  courseWeeks,
  courseLessons,
  hasCourse,
  isCheckpointLesson,
  passThreshold,
  unlockedSpecials,
} from "@/lib/course";
import { Completion } from "@/components/Completion";
import { handlerSay } from "@/lib/handler-bus";
import { monthKey, useApp, weekKey, type CheckInResult } from "@/lib/store";
import { dueCards } from "@/lib/srs";
import { TOUR_STEP } from "@/lib/tutorial";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Learning Map — Habla" },
      {
        name: "description",
        content:
          "A winding checkpoint map of the 28-day Spanish Foundations course: run today's lesson, or tap a cleared checkpoint to drill its vocabulary in the vault.",
      },
      { property: "og:title", content: "Your Learning Map — Habla" },
      {
        property: "og:description",
        content: "Lesson units, daily challenges and spaced review on one progress map.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Hydrated>
      <DashboardPage />
    </Hydrated>
  ),
});

type Node = {
  key: string;
  title: string;
  dayNumber: number;
  group: string;
  href: "/session" | "/vault";
};

function DashboardPage() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const completedDays = useApp((s) => s.completedDays);
  const cards = useApp((s) => s.cards);
  const quests = useApp((s) => s.quests);
  const registerLogin = useApp((s) => s.registerLogin);
  const challengesDone = useApp((s) => s.challengesDone);
  const checkIns = useApp((s) => s.checkIns);
  const checkInPoints = useApp((s) => s.checkInPoints);
  const doCheckIn = useApp((s) => s.checkIn);
  const weeklyRecallDone = useApp((s) => s.weeklyRecallDone);
  const [justChecked, setJustChecked] = useState<CheckInResult | null>(null);
  const [celebration, setCelebration] = useState<{ title: string; subtitle: string } | null>(null);
  const completeChallenge = useApp((s) => s.completeChallenge);
  const tutorialStep = useApp((s) => s.tutorialStep);
  const startTutorial = useApp((s) => s.startTutorial);
  const setTutorialStep = useApp((s) => s.setTutorialStep);

  useEffect(() => {
    if (!profile) void navigate({ to: "/start" });
    else {
      registerLogin();
      startTutorial();
    }
  }, [profile, navigate, registerLogin, startTutorial]);

  useEffect(() => {
    if (!profile) return;
    if (useApp.getState().tutorialStep >= 0) return;
    const t = setTimeout(
      () =>
        handlerSay(
          `${profile.callsign}, the glowing checkpoint is your next run. Cleared ones open a recall drill.`,
          "nudge",
        ),
      900,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.callsign]);

  if (!profile) return null;

  const lang = langById(profile.langId);
  const tier = onboarding.daily_commitment_tiers.find((t) => t.id === profile.tierId);
  const courseOn = hasCourse(profile.langId);
  const due = dueCards(cards, profile.langId, 999).length;

  const nodes: Node[] = courseOn
    ? courseLessons.map((l) => ({
        key: courseKey(l.id),
        title: l.title,
        dayNumber: l.day,
        group: `WEEK ${l.week} — ${l.weekTitle}`,
        href: "/session",
      }))
    : missionDays(profile.langId).map((d) => ({
        key: d.key,
        title: d.day.theme,
        dayNumber: d.day.day_number,
        group: arcTitle(d.arcId).toUpperCase(),
        href: "/session",
      }));

  const nextIdx = nodes.findIndex((n) => !completedDays.includes(n.key));
  const activeIdx = nextIdx === -1 ? nodes.length - 1 : nextIdx;
  const activeNode = nodes[activeIdx];
  const activeLesson = courseOn ? courseLessons[activeIdx] : undefined;
  const legacyActive = courseOn ? undefined : missionDays(profile.langId)[activeIdx];
  const challenge = activeLesson ? challengeForDay(activeLesson.day) : undefined;
  const specials = courseOn && activeLesson ? unlockedSpecials(activeLesson.day) : [];
  const challengeDone = challenge ? challengesDone.includes(challenge.id) : false;
  const gate = activeLesson ? passThreshold(activeLesson.id) : 0;
  const isCheckpoint = activeLesson ? isCheckpointLesson(activeLesson.id) : false;
  const allDone = nextIdx === -1;

  // Weeks whose lessons are all cleared unlock a recall simulation.
  const recallWeeks = courseOn
    ? courseWeeks.filter((w) => w.lessons.every((l) => completedDays.includes(courseKey(l.id))))
    : [];

  // Duolingo-style winding path: horizontal offsets cycle left → centre → right.
  const OFFSETS = [0, 46, 66, 46, 0, -46, -66, -46];

  const headline = activeLesson?.title ?? legacyActive?.day.theme ?? "Course complete";
  const blurb = activeLesson
    ? activeLesson.objectives.slice(0, 2).join(" · ")
    : legacyActive
      ? legacyActive.day.learning_objectives.slice(0, 2).join(" · ")
      : "Every authored day is cleared. Keep your vault serviced while the next unit is unlocked.";

  return (
    <AppFrame>
      {celebration && (
        <Completion
          title={celebration.title}
          subtitle={celebration.subtitle}
          onDone={() => setCelebration(null)}
        />
      )}
      <section className="paper-card p-4">
        <p className="hud text-[10px] text-destructive">
          {allDone ? "All done for now" : "Today's lesson"}
        </p>
        <h1 className="hud mt-1 text-lg leading-tight">
          {lang?.flag_emoji} {headline}
        </h1>
        {activeLesson && (
          <p className="hud mt-1 text-[10px] text-secondary">
            WEEK {activeLesson.week} · DAY {activeLesson.day} · {activeLesson.focus.toUpperCase()}
          </p>
        )}
        <p className="mt-2 text-sm">{blurb}</p>
        {activeLesson && (
          <p className="mt-2 text-xs italic opacity-70">Goal: {activeLesson.mission}</p>
        )}
        {activeLesson && (
          <p className="hud mt-2 text-[10px] text-destructive">
            {isCheckpoint ? "Weekly checkpoint · " : ""}Unlocks the next lesson at {Math.round(gate * 100)}% accuracy
          </p>
        )}
        <div className="hud mt-3 flex items-center gap-3 text-[10px] opacity-70">
          <span>
            {tier?.label.toUpperCase()} ·{" "}
            {activeLesson ? `${activeLesson.estimated_minutes} MIN` : `${tier?.minutes} MIN`}
          </span>
          <span>{due} DUE TO REVIEW</span>
        </div>
        {!allDone && activeNode && (
          <Link
            to="/session"
            search={{ day: activeNode.key, mode: "mission" }}
            data-tour="start-lesson"
            onClick={() => {
              if (tutorialStep === TOUR_STEP['start-lesson']) setTutorialStep(TOUR_STEP['first-word']!);
            }}
            className="hud mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-background py-3 text-xs text-primary"
          >
            <Target className="h-4 w-4" /> {courseOn ? "Start today's lesson" : "Start lesson"}
          </Link>
        )}
      </section>

      {challenge && (
        <section className="mt-3 rounded-sm border border-secondary/50 bg-secondary/10 p-4">
          <p className="hud text-[10px] text-secondary">
            <Flag className="mr-1 inline h-3 w-3" /> DAILY CHALLENGE · {challenge.title.toUpperCase()}
          </p>
          <p className="mt-2 text-sm">{challenge.prompt}</p>
          <p className="hud mt-2 text-[10px] opacity-70">
            PATTERN: {challenge.target_pattern} · {challenge.estimated_minutes} MIN
          </p>
          {challengeDone ? (
            <p className="hud mt-3 flex items-center gap-1 text-[10px] text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> LOGGED · +25 XP
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                completeChallenge(challenge.id, 25);
                setCelebration({ title: "Challenge cleared!", subtitle: "+25 XP added to today" });
              }}
              className="hud mt-3 w-full rounded-sm border border-secondary/60 py-2.5 text-[10px] text-secondary"
            >
              MARK CHALLENGE COMPLETE · +25 XP
            </button>
          )}
        </section>
      )}

      {due > 0 && (
        <Link
          to="/vault"
          search={{ day: "due" }}
          className="hud mt-3 flex w-full items-center justify-between rounded-sm border border-primary/50 bg-primary/10 px-4 py-3 text-[10px] text-primary"
        >
          <span>PRACTICE DECK · {due} ITEMS DUE</span>
          <span>REVIEW NOW →</span>
        </Link>
      )}

      <CheckInCard
        checkIns={checkIns}
        points={checkInPoints}
        result={justChecked}
        onCheckIn={() => {
          const r = doCheckIn();
          setJustChecked(r);
          if (r)
            setCelebration({
              title: "Checked in!",
              subtitle: `+${r.points} points · ${r.weekCount} days this week`,
            });
        }}
      />

      {recallWeeks.length > 0 && (
        <section className="mt-6">
          <p className="hud text-[10px] text-muted-foreground">Weekly recall</p>
          <ul className="mt-2 space-y-2">
            {recallWeeks.map((w) => {
              const done = weeklyRecallDone.includes(w.week);
              return (
                <li
                  key={w.week}
                  className={`rounded-sm border px-3 py-3 ${
                    done ? "border-border bg-card" : "border-secondary/60 bg-secondary/10"
                  }`}
                >
                  <p className="hud text-[10px] text-secondary">
                    <CalendarCheck className="mr-1 inline h-3 w-3" /> WEEK {w.week} — {w.title.toUpperCase()}
                  </p>
                  <p className="mt-1 text-xs">
                    Recall and use everything from this week in one live simulation.
                  </p>
                  {done ? (
                    <p className="hud mt-2 flex items-center gap-1 text-[10px] text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" /> REVIEW DONE
                    </p>
                  ) : (
                    <Link
                      to="/simulate"
                      search={{ weekly: w.week }}
                      className="hud mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-secondary/60 py-2.5 text-[10px] text-secondary"
                    >
                      <Radio className="h-3.5 w-3.5" /> START WEEKLY REVIEW · +120 XP
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <p className="hud text-[10px] text-muted-foreground">Daily quests</p>
        <ul className="mt-2 space-y-2">
          {quests.list.map((q) => (
            <li
              key={q.id}
              className="flex items-center justify-between rounded-sm border border-border bg-card px-3 py-2.5"
            >
              <span className={`text-xs ${q.done ? "line-through opacity-50" : ""}`}>{q.label}</span>
              <span className="hud text-[10px] text-primary">+{q.reward_xp}</span>
            </li>
          ))}
        </ul>
      </section>

      {specials.length > 0 && (
        <section className="mt-6">
          <p className="hud text-[10px] text-muted-foreground">Special challenges</p>
          <ul className="mt-2 space-y-2">
            {specials.slice(-3).map((c) => (
              <li key={c.id} className="rounded-sm border border-border bg-card px-3 py-2.5">
                <p className="hud text-[10px] text-secondary">{c.title.toUpperCase()}</p>
                <p className="mt-1 text-xs">{c.scenario}</p>
                <Link
                  to="/simulate"
                  className="hud mt-2 inline-flex items-center gap-1 text-[10px] text-primary"
                >
                  <Radio className="h-3 w-3" /> RUN IN CONVERSATION PRACTICE
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-7">
        <p className="hud text-[10px] text-muted-foreground">
          {courseOn ? "Spanish foundations — 28 day map" : "Your map"}
        </p>

        <div className="relative mt-4">
          {nodes.map((n, i) => {
            const done = completedDays.includes(n.key);
            const locked = i > activeIdx;
            const active = i === activeIdx && !done;
            const offset = OFFSETS[i % OFFSETS.length]!;
            const nextOffset = OFFSETS[(i + 1) % OFFSETS.length]!;
            const showGroup = i === 0 || nodes[i - 1]!.group !== n.group;

            return (
              <div key={n.key}>
                {showGroup && (
                  <p className="hud mb-3 mt-1 text-center text-[9px] text-secondary">
                    — {n.group} —
                  </p>
                )}
                <div className="relative flex flex-col items-center">
                  <Link
                    to={done ? "/vault" : "/session"}
                    search={done ? { day: n.key } : { day: n.key, mode: "mission" }}
                    disabled={locked}
                    style={{ transform: `translateX(${offset}px)` }}
                    aria-label={`${n.title} — ${locked ? "locked" : done ? "cleared, open recall drill" : "next lesson"}`}
                    className={`relative z-10 grid h-16 w-16 place-items-center rounded-full border-2 transition-transform active:scale-95 ${
                      locked
                        ? "pointer-events-none border-border/60 bg-card/40 text-muted-foreground"
                        : done
                          ? "border-primary bg-primary/15 text-primary"
                          : "mic-live border-secondary bg-secondary/20 text-secondary"
                    }`}
                  >
                    {locked ? (
                      <Lock className="h-5 w-5" />
                    ) : done ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <Star className="h-6 w-6" />
                    )}
                    <span className="hud absolute -bottom-1 rounded-full border border-border bg-background px-1.5 text-[8px] text-muted-foreground">
                      {n.dayNumber}
                    </span>
                  </Link>

                  <p
                    style={{ transform: `translateX(${offset}px)` }}
                    className={`mt-3 max-w-[9rem] text-center text-[11px] leading-snug ${
                      locked ? "text-muted-foreground/60" : active ? "text-secondary" : "text-foreground"
                    }`}
                  >
                    {n.title}
                  </p>
                  {done && (
                    <span
                      style={{ transform: `translateX(${offset}px)` }}
                      className="hud mt-1 flex items-center gap-1 text-[8px] text-primary"
                    >
                      <Brain className="h-3 w-3" /> RECALL DRILL
                    </span>
                  )}

                  {i < nodes.length - 1 && (
                    <span
                      aria-hidden
                      className={`my-3 block h-8 w-0.5 ${locked ? "bg-border/50" : "bg-border"}`}
                      style={{ transform: `translateX(${(offset + nextOffset) / 2}px) rotate(${(nextOffset - offset) / 6}deg)` }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          <div className="mt-6 flex flex-col items-center gap-2">
            <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground">
              <Crown className="h-6 w-6" />
            </span>
            <p className="hud text-[9px] text-muted-foreground">Next unit — locked</p>
          </div>
        </div>
      </section>
    </AppFrame>
  );
}


function CheckInCard({
  checkIns,
  points,
  result,
  onCheckIn,
}: {
  checkIns: string[];
  points: number;
  result: CheckInResult | null;
  onCheckIn: () => void;
}) {
  const today = new Date();
  const wk = weekKey(today);
  const mk = monthKey(today);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const checkedToday = checkIns.includes(todayKey);
  const weekCount = checkIns.filter((d) => weekKey(new Date(d)) === wk).length;
  const monthCount = checkIns.filter((d) => d.startsWith(mk)).length;

  // Monday-first grid of the current week.
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { key, label: ["M", "T", "W", "T", "F", "S", "S"][i]!, hit: checkIns.includes(key) };
  });

  return (
    <section className="mt-6 rounded-sm border border-primary/50 bg-primary/5 p-4">
      <p className="hud text-[10px] text-primary">
        <CalendarCheck className="mr-1 inline h-3 w-3" /> ROLL CALL · {points} PTS
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div key={d.key} className="flex flex-col items-center gap-1">
            <span
              className={`grid h-8 w-8 place-items-center rounded-full border text-[10px] ${
                d.hit
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {d.hit ? <Check className="h-4 w-4" /> : d.label}
            </span>
            <span className="hud text-[8px] text-muted-foreground">{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="hud mt-3 flex justify-between text-[9px] text-muted-foreground">
        <span>WEEK {weekCount}/7</span>
        <span>MONTH {monthCount}</span>
        <span>TOTAL {checkIns.length}</span>
      </div>
      {checkedToday ? (
        <p className="hud mt-3 flex items-center justify-center gap-1 text-[10px] text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" /> CHECKED IN TODAY
          {result ? ` · +${result.points} PTS` : ""}
        </p>
      ) : (
        <button
          type="button"
          onClick={onCheckIn}
          className="hud mt-3 flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-2.5 text-[10px] text-primary-foreground"
        >
          <Sparkles className="h-3.5 w-3.5" /> CHECK IN · +10 PTS
        </button>
      )}
      {result && result.bonuses.length > 0 && (
        <ul className="mt-2 space-y-1">
          {result.bonuses.map((b) => (
            <li key={b.label} className="hud text-[9px] text-secondary">
              {b.label} · +{b.points} PTS
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
