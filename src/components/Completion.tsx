import { useEffect, useMemo } from "react";
import { PartyPopper, Star } from "lucide-react";
import { sfx } from "@/lib/sfx";

const CONFETTI_COLORS = [
  "var(--primary)",
  "var(--secondary)",
  "var(--amber)",
  "var(--destructive)",
];

/**
 * Full-screen celebration: confetti rain, a bouncy badge and a happy chime,
 * then `onDone` fires so the app keeps the momentum going.
 */
export function Completion({
  title = "Nice work!",
  subtitle,
  tone = "complete",
  duration = 1800,
  onDone,
}: {
  title?: string;
  subtitle?: string;
  tone?: "complete" | "levelup";
  duration?: number;
  onDone?: () => void;
}) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        left: `${(i * 97) % 100}%`,
        dx: `${((i % 7) - 3) * 18}px`,
        spin: `${((i % 5) + 2) * 220}deg`,
        dur: `${1.2 + ((i % 6) * 0.18)}s`,
        delay: `${(i % 9) * 45}ms`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        round: i % 3 === 0,
      })),
    [],
  );

  useEffect(() => {
    sfx(tone);
    if (!onDone) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-background/80 backdrop-blur-sm">
      {confetti.map((c, i) => (
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

      <div className="relative grid place-items-center">
        <span className="burst-ring absolute h-28 w-28 rounded-full border-4 border-primary/60" />
        <span
          className="burst-ring absolute h-28 w-28 rounded-full border-4 border-secondary/60"
          style={{ animationDelay: "150ms" }}
        />

        <div className="seal-in relative grid place-items-center gap-2 rounded-3xl border-2 border-border bg-card px-7 py-6 text-center shadow-[0_10px_0_-2px_var(--border),0_24px_40px_-24px_rgba(0,0,0,.4)]">
          <div className="wiggle grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
            {tone === "levelup" ? (
              <Star className="h-7 w-7 fill-current" />
            ) : (
              <PartyPopper className="h-7 w-7" />
            )}
          </div>
          <p className="text-lg font-extrabold">{title}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
