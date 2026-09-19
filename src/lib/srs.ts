import { srsEngine } from "@/lib/content";
import { reviewSchedule } from "@/lib/course";


export type SrsCard = {
  id: string;
  target: string;
  translation: string;
  lang: string;
  ease: number;
  intervalDays: number;
  dueAt: number;
  reps: number;
  lapses: number;
};

export function newCard(
  id: string,
  target: string,
  translation: string,
  lang: string,
  now = Date.now(),
): SrsCard {
  return {
    id,
    target,
    translation,
    lang,
    ease: srsEngine.ease_factor_default,
    intervalDays: 0,
    dueAt: now,
    reps: 0,
    lapses: 0,
  };
}

const DAY = 86400000;

/** Modified SM-2 per spec 13 (srs_engine). */
export function schedule(card: SrsCard, correct: boolean, now = Date.now()): SrsCard {
  if (!correct) {
    return {
      ...card,
      ease: Math.max(srsEngine.ease_factor_minimum, card.ease - srsEngine.ease_factor_penalty_on_miss),
      intervalDays: srsEngine.interval_on_incorrect_days,
      dueAt: now + srsEngine.interval_on_incorrect_days * DAY,
      reps: card.reps + 1,
      lapses: card.lapses + 1,
    };
  }
  const next =
    card.intervalDays === 0
      ? 1
      : Math.min(srsEngine.max_interval_days, card.intervalDays * card.ease);
  return {
    ...card,
    intervalDays: next,
    dueAt: now + next * DAY,
    reps: card.reps + 1,
  };
}

export function dueCards(cards: Record<string, SrsCard>, lang: string, cap: number, now = Date.now()) {
  return Object.values(cards)
    .filter((c) => c.lang === lang && c.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, cap);
}

/* ── Manifest-driven ladder for authored course items ─────────────────
   correct_no_hint → promote to next interval
   hinted_answer   → retain current interval
   wrong_answer    → same session + next day                            */

export type Outcome = "correct" | "hinted" | "wrong";

const LADDER = reviewSchedule.new_item_intervals_days;

function ladderIndex(intervalDays: number) {
  const i = LADDER.findIndex((d) => d >= intervalDays);
  return i === -1 ? LADDER.length - 1 : i;
}

/** Schedule a card per the course manifest review schedule. */
export function scheduleGraded(card: SrsCard, outcome: Outcome, now = Date.now()): SrsCard {
  if (outcome === "wrong") {
    return {
      ...card,
      ease: Math.max(
        srsEngine.ease_factor_minimum,
        card.ease - srsEngine.ease_factor_penalty_on_miss,
      ),
      intervalDays: 1,
      dueAt: now + DAY,
      reps: card.reps + 1,
      lapses: card.lapses + 1,
    };
  }

  const current = ladderIndex(card.intervalDays);
  const next =
    outcome === "hinted" ? current : Math.min(LADDER.length - 1, current + 1);
  const days = LADDER[next] ?? 1;
  return {
    ...card,
    intervalDays: days,
    dueAt: now + Math.max(days, outcome === "hinted" ? 0 : 1) * DAY,
    reps: card.reps + 1,
  };
}
