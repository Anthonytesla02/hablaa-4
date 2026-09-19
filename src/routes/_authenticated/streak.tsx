import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Check, Coins } from "lucide-react";
import { Hydrated } from "@/components/AppFrame";
import { Completion } from "@/components/Completion";
import { sfx } from "@/lib/sfx";
import { useApp } from "@/lib/store";
import mascot from "@/assets/llama-cheer.png.asset.json";
import calendarLlama from "@/assets/llama-calendar.png.asset.json";

const GOALS = [
  { days: 7, reward: 35 },
  { days: 14, reward: 140 },
  { days: 30, reward: 210 },
  { days: 50, reward: 350 },
] as const;

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

const CONFETTI_COLORS = ["var(--primary)", "var(--secondary)", "var(--amber)", "var(--destructive)"];

const HOLD_MS = 1500;

export const Route = createFileRoute("/_authenticated/streak")({
  head: () => ({
    meta: [
      { title: "Your streak — Habla" },
      { name: "description", content: "Celebrate your streak and commit to a daily practice goal." },
      { property: "og:title", content: "Your streak — Habla" },
      { property: "og:description", content: "Celebrate your streak and commit to a daily practice goal." },
    ],
  }),
  component: () => (
    <Hydrated>
      <StreakPage />
    </Hydrated>
  ),
});

function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        left: `${(i * 61) % 100}%`,
        dx: `${((i % 9) - 4) * 22}px`,
        spin: `${((i % 5) + 2) * 260}deg`,
        dur: `${1.3 + (i % 7) * 0.2}s`,
        delay: `${(i % 12) * 90}ms`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        round: i % 3 === 0,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((c, i) => (
        <span
          key={i}
          className={`confetti-fall absolute top-0 h-3 w-2 ${c.round ? "rounded-full" : "rounded-[2px]"}`}
          style={
            {
              left: c.left,
              backgroundColor: c.color,
              animationDelay: c.delay,
              "--dx": c.dx,
              "--spin": c.spin,
              "--dur": c.dur,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function StreakPage() {
  const navigate = useNavigate();
  const streak = useApp((s) => s.streak);
  const commitStreakGoal = useApp((s) => s.commitStreakGoal);
  const markStreakCelebrated = useApp((s) => s.markStreakCelebrated);

  const [stage, setStage] = useState<"streak" | "goal" | "sealed">("streak");
  const [picked, setPicked] = useState<number>(30);
  const [hold, setHold] = useState(0);
  const raf = useRef<number | null>(null);
  const days = Math.max(1, streak);

  useEffect(() => {
    sfx("levelup");
  }, []);

  useEffect(() => {
    if (stage !== "sealed") return;
    const t = setTimeout(() => void navigate({ to: "/dashboard" }), 2600);
    return () => clearTimeout(t);
  }, [stage, navigate]);

  const stopHold = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    setHold(0);
  };

  const startHold = () => {
    if (raf.current) return;
    const begun = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - begun) / HOLD_MS);
      setHold(p);
      if (p >= 1) {
        raf.current = null;
        const goal = GOALS.find((g) => g.days === picked)!;
        commitStreakGoal(goal.days, goal.reward);
        sfx("levelup");
        setStage("sealed");
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => stopHold(), []);

  if (stage === "streak") {
    return (
      <div className="topo relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center overflow-hidden px-5 py-8">
        <Confetti />
        <div className="relative flex flex-col items-center text-center">
          <div className="seal-in rounded-3xl border-2 border-border bg-card px-5 py-4">
            <p className="text-base font-extrabold">
              A streak is born! Practice every day to help it grow.
            </p>
          </div>

          <div className="relative mt-8 grid place-items-center">
            <span className="burst-ring absolute h-44 w-44 rounded-full border-4 border-amber/60" />
            <span
              className="burst-ring absolute h-44 w-44 rounded-full border-4 border-primary/50"
              style={{ animationDelay: "220ms" }}
            />
            <Flame className="absolute h-40 w-40 animate-pulse text-amber/35" strokeWidth={1.5} />
            <img
              src={mascot.url}
              alt="Habla llama celebrating a new streak"
              className="wiggle relative h-36 w-36 object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.18)]"
            />
          </div>

          <p className="seal-in mt-6 text-[80px] font-extrabold leading-none text-amber">{days}</p>
          <p className="bounce-soft text-2xl font-extrabold text-amber">
            day streak{days > 1 ? "" : ""}
          </p>

          <ul className="mt-8 grid w-full grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d, i) => {
              const lit = i < Math.min(7, days);
              return (
                <li key={d} className="flex flex-col items-center gap-1.5">
                  <span className={`text-xs font-extrabold ${lit ? "text-amber" : "text-muted-foreground"}`}>
                    {d}
                  </span>
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full ${
                      lit ? "scale-in bg-amber text-background" : "bg-muted"
                    }`}
                    style={{ animationDelay: `${i * 90}ms` }}
                  >
                    {lit && <Check className="h-5 w-5" strokeWidth={3.5} />}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <button
          onClick={() => {
            sfx("transition");
            markStreakCelebrated();
            setStage("goal");
          }}
          className="hud relative mt-10 rounded-2xl bg-secondary py-4 text-center text-xs text-background shadow-[0_5px_0_-1px_color-mix(in_oklab,var(--secondary)_60%,black)] active:translate-y-[2px] active:shadow-none"
        >
          I'M COMMITTED
        </button>
      </div>
    );
  }

  if (stage === "sealed") {
    const goal = GOALS.find((g) => g.days === picked)!;
    return (
      <div className="topo relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center overflow-hidden px-5 text-center">
        <Confetti />
        <Completion
          title={`${goal.days}-day goal locked in!`}
          subtitle={`+${goal.reward} credits`}
          tone="levelup"
          duration={2400}
        />
        <img
          src={calendarLlama.url}
          alt="Habla llama pointing at a calendar"
          className="seal-in h-44 w-44 object-contain"
        />
        <p className="hud mt-6 text-[10px] text-secondary">TAKING YOU BACK TO YOUR LESSONS…</p>
      </div>
    );
  }

  return (
    <div className="topo mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-5 py-8">
      <div className="flex flex-col items-center text-center">
        <div className="seal-in rounded-3xl border-2 border-border bg-card px-5 py-4">
          <p className="text-base font-extrabold">
            You'll be <span className="text-amber">8x more</span> likely to complete the course!
          </p>
        </div>
        <img
          src={calendarLlama.url}
          alt="Habla llama pointing at a calendar"
          className="bounce-soft mt-6 h-40 w-40 object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.18)]"
        />
      </div>

      <ul className="mt-8 space-y-3">
        {GOALS.map((g) => {
          const active = picked === g.days;
          return (
            <li key={g.days}>
              <button
                onClick={() => {
                  sfx("transition");
                  setPicked(g.days);
                }}
                className={`flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 transition-colors ${
                  active ? "border-secondary bg-secondary/10 text-secondary" : "border-border bg-card"
                }`}
              >
                <span className="text-lg font-extrabold">{g.days} days</span>
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <Coins className="h-4 w-4" />
                  Earn {g.reward} credits
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onContextMenu={(e) => e.preventDefault()}
        className="hud relative mt-8 select-none overflow-hidden rounded-2xl border-2 border-secondary bg-card py-4 text-center text-xs text-secondary active:translate-y-[2px]"
      >
        <span
          className="absolute inset-y-0 left-0 bg-secondary/25 transition-[width] duration-75"
          style={{ width: `${hold * 100}%` }}
        />
        <span className="relative">
          {hold > 0 ? "KEEP HOLDING…" : "PRESS & HOLD: COMMIT TO MY GOAL"}
        </span>
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Hold the button down until it fills to lock in your goal.
      </p>
    </div>
  );
}
