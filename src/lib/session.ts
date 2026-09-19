import type { Dictation, Mcq, MissionDay, PatternDrill, Shadow, Sts } from "@/lib/content";
import { srsEngine } from "@/lib/content";
import {
  activityMode,
  type CourseActivity,
  type CourseLesson,
} from "@/lib/course";
import { dueCards, type SrsCard } from "@/lib/srs";

export type Step =
  | { kind: "mcq"; data: Mcq }
  | { kind: "pattern"; data: PatternDrill; sub: { target: string; translation: string } }
  | { kind: "review"; data: SrsCard }
  | { kind: "shadow"; data: Shadow }
  | { kind: "sts"; data: Sts }
  | { kind: "dictation"; data: Dictation }
  // Spanish Foundations course steps
  | { kind: "teach"; lesson: CourseLesson }
  | { kind: "choice"; act: CourseActivity }
  | { kind: "write"; act: CourseActivity }
  | { kind: "order"; act: CourseActivity }
  | { kind: "match"; act: CourseActivity }
  | { kind: "utter"; act: CourseActivity }
  | { kind: "roleplay"; act: CourseActivity; lesson: CourseLesson }
  | { kind: "dialogue"; lesson: CourseLesson }
  | { kind: "exit"; lesson: CourseLesson };


const TIER_MIX: Record<
  string,
  { mcq: number; pattern: number; review: number; shadow: number; sts: number; dictation: number }
> = {
  recon_10: { mcq: 4, pattern: 2, review: 8, shadow: 1, sts: 1, dictation: 0 },
  field_op_30: { mcq: 6, pattern: 4, review: 20, shadow: 2, sts: 2, dictation: 1 },
  full_deployment_60: { mcq: 99, pattern: 99, review: 40, shadow: 3, sts: 99, dictation: 99 },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

export function buildSession(opts: {
  day: MissionDay;
  tierId: string;
  cards: Record<string, SrsCard>;
  lang: string;
  checkpoint?: boolean;
}): Step[] {
  const { day, tierId, cards, lang, checkpoint } = opts;
  const mix = TIER_MIX[tierId] ?? TIER_MIX['field_op_30']!;
  const reviewCap = Math.min(
    mix.review,
    (srsEngine.daily_review_cap_by_tier as Record<string, number>)[tierId] ?? 20,
  );

  if (checkpoint) {
    // Checkpoint quiz composition from the data file: 2 MCQ, 1 shadow, 1 STS, 1 dictation.
    const steps: Step[] = [];
    shuffle(day.tts_multiple_choice).slice(0, 2).forEach((d) => steps.push({ kind: "mcq", data: d }));
    shuffle(day.shadowing_drills).slice(0, 1).forEach((d) => steps.push({ kind: "shadow", data: d }));
    shuffle(day.speech_to_speech).slice(0, 1).forEach((d) => steps.push({ kind: "sts", data: d }));
    shuffle(day.dictation).slice(0, 1).forEach((d) => steps.push({ kind: "dictation", data: d }));
    return steps;
  }

  const newDrills: Step[] = [];
  shuffle(day.tts_multiple_choice)
    .slice(0, mix.mcq)
    .forEach((d) => newDrills.push({ kind: "mcq", data: d }));

  const patternSteps: Step[] = [];
  for (const pd of day.pattern_drills) {
    for (const sub of pd.substitutions) patternSteps.push({ kind: "pattern", data: pd, sub });
  }

  const reviews: Step[] = dueCards(cards, lang, reviewCap).map((c) => ({ kind: "review", data: c }));
  const shadows: Step[] = shuffle(day.shadowing_drills)
    .slice(0, mix.shadow)
    .map((d) => ({ kind: "shadow", data: d }));
  const sts: Step[] = shuffle(day.speech_to_speech)
    .slice(0, mix.sts)
    .map((d) => ({ kind: "sts", data: d }));
  const dict: Step[] = shuffle(day.dictation)
    .slice(0, mix.dictation)
    .map((d) => ({ kind: "dictation", data: d }));

  // Presentation → recognition → echo → production → spaced review (spec 6.2)
  return [
    ...newDrills,
    ...shuffle(patternSteps).slice(0, mix.pattern),
    ...shadows,
    ...reviews,
    ...sts,
    ...dict,
  ];
}

/** Build one interactive run of an authored Spanish Foundations lesson. */
export function buildLessonSession(opts: {
  lesson: CourseLesson;
  cards: Record<string, SrsCard>;
  lang: string;
  reviewCap?: number;
}): Step[] {
  const { lesson, cards, lang, reviewCap = 6 } = opts;
  const steps: Step[] = [{ kind: "teach", lesson }];

  for (const act of lesson.activities) {
    switch (activityMode(act)) {
      case "choice":
        steps.push({ kind: "choice", act });
        break;
      case "order":
        steps.push({ kind: "order", act });
        break;
      case "match":
        steps.push({ kind: "match", act });
        break;
      case "speak":
        steps.push({ kind: "utter", act });
        break;
      case "roleplay":
        steps.push({ kind: "roleplay", act, lesson });
        break;
      default:
        steps.push({ kind: "write", act });
    }
  }

  steps.push({ kind: "dialogue", lesson });

  const reviews: Step[] = dueCards(cards, lang, reviewCap).map((c) => ({
    kind: "review",
    data: c,
  }));
  steps.push(...reviews);
  steps.push({ kind: "exit", lesson });
  return steps;
}

export function stepLabel(kind: Step["kind"]) {
  return {
    mcq: "Listen & Choose",
    pattern: "Pattern Practice",
    review: "Quick Review",
    shadow: "Repeat After Me",
    sts: "Talk Back",
    dictation: "Write What You Hear",
    teach: "New Words",
    choice: "Pick the Answer",
    write: "Write It",
    order: "Build the Sentence",
    match: "Match Them Up",
    utter: "Say It Out Loud",
    roleplay: "Role Play",
    dialogue: "Listen to the Chat",
    exit: "Exit Check",
  }[kind];
}

