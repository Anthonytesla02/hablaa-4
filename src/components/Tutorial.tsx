import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { stopSpeaking } from "@/lib/speech";
import { sfx } from "@/lib/sfx";
import { useApp } from "@/lib/store";
import { TOUR } from "@/lib/tutorial";

type Rect = { top: number; left: number; width: number; height: number };

function useTargetRect(selector: string | undefined, key: number) {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setRect(null);
      }
      raf = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(raf);
  }, [selector, key]);

  return rect;
}

/** Floating walkthrough that guides a brand-new learner to their first recording. */
export function Tutorial() {
  const stepIndex = useApp((s) => s.tutorialStep);
  const setStep = useApp((s) => s.setTutorialStep);
  const end = useApp((s) => s.endTutorial);
  const rate = useApp((s) => s.settings.rate);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const step = stepIndex >= 0 ? TOUR[stepIndex] : undefined;
  const onPage =
    !!step &&
    ((step.page === "dashboard" && pathname.startsWith("/dashboard")) ||
      (step.page === "session" && pathname.startsWith("/session")));

  const rect = useTargetRect(onPage ? step?.target : undefined, stepIndex);

  // The walkthrough is read silently — no spoken narration over the lesson audio.



  // Keep the highlighted element in view.
  useEffect(() => {
    if (!onPage || !step?.target) return;
    const el = document.querySelector(step.target);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, onPage]);

  if (!step || !onPage) return null;

  const last = stepIndex === TOUR.length - 1;
  const pad = 8;

  function next() {
    sfx("click");
    stopSpeaking();
    if (last) end();
    else setStep(stepIndex + 1);
  }

  function skip() {
    sfx("tap");
    stopSpeaking();
    end();
  }

  // Place the card away from the highlighted element.
  const below = rect ? rect.top < window.innerHeight * 0.45 : false;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {rect ? (
        <div
          className="absolute rounded-2xl ring-4 ring-primary transition-all duration-300"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(20,14,8,0.62)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(20,14,8,0.62)]" />
      )}

      <div
        className="pointer-events-auto absolute left-1/2 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border-2 border-primary bg-card p-4 shadow-xl"
        style={
          rect
            ? below
              ? { top: Math.min(rect.top + rect.height + 20, window.innerHeight - 200) }
              : { bottom: Math.min(window.innerHeight - rect.top + 20, window.innerHeight - 180) }
            : { top: "50%", transform: "translate(-50%, -50%)" }
        }
      >
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-secondary">
          <Sparkles className="h-3.5 w-3.5" />
          Step {stepIndex + 1} of {TOUR.length}
        </p>
        <h2 className="mt-1 text-base font-extrabold text-foreground">{step.title}</h2>
        <p className="mt-1.5 text-sm leading-snug text-foreground/80">{step.text}</p>

        <div className="mt-4 flex items-center gap-2">
          {step.advance === "button" ? (
            <button
              type="button"
              onClick={next}
              className="btn-3d flex-1 rounded-2xl bg-primary py-3 text-xs font-extrabold text-primary-foreground"
            >
              {step.cta ?? "Next"}
            </button>
          ) : (
            <p className="flex-1 text-[11px] font-extrabold text-primary">
              Go ahead — tap the highlighted spot.
            </p>
          )}
          <button
            type="button"
            onClick={skip}
            className="rounded-2xl border-2 border-border px-3 py-3 text-[11px] font-extrabold text-muted-foreground"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
