/** Spanish Foundations (A0-A1) course adapter — ingests the authored weekly JSON files. */
import w1 from "@/data/course/spanish_week_1.json";
import w2 from "@/data/course/spanish_week_2.json";
import w3 from "@/data/course/spanish_week_3.json";
import w4 from "@/data/course/spanish_week_4.json";
import manifestRaw from "@/data/course/course_manifest.json";
import dailyRaw from "@/data/course/daily_challenges.json";
import specialRaw from "@/data/course/special_challenges.json";

export type CourseVocab = {
  id: string;
  es: string;
  en: string;
  pos?: string | null;
  gender?: string | null;
  review_tags?: string[];
};

export type CourseActivity = {
  id: string;
  type: string;
  prompt: string;
  answer: string;
  hint?: string;
  feedback?: string;
  rationale?: string;
  review_item_ids?: string[];
  difficulty?: string;
  options?: string[];
  accepted_answers?: string[];
};

export type CourseLesson = {
  id: string;
  day: number;
  title: string;
  focus: string;
  estimated_minutes: number;
  objectives: string[];
  teaching: { explanation: string; pattern?: string; culture_note?: string };
  vocabulary: CourseVocab[];
  grammar_tags: string[];
  examples: { es: string; en: string; analysis?: string }[];
  activities: CourseActivity[];
  mission: string;
  dialogue: {
    title: string;
    lines: { speaker: string; es: string; en: string }[];
    learner_turns?: string[];
  };
  exit_check: string[];
  week: number;
  weekTitle: string;
};

type RawWeek = { week: number; title: string; lessons: Omit<CourseLesson, "week" | "weekTitle">[] };

const WEEKS = [w1, w2, w3, w4] as unknown as RawWeek[];

export const courseLangId = "spanish";
export const courseManifest = manifestRaw as unknown as {
  title: string;
  level: string;
  description: string;
  total_days: number;
  weeks: { week: number; checkpoint_lesson_id: string }[];
  review_schedule: {
    new_item_intervals_days: number[];
    wrong_answer: string;
    hinted_answer: string;
    correct_no_hint: string;
  };
  mastery_rules: {
    daily_activity_accuracy: number;
    daily_exit_accuracy: number;
    weekly_checkpoint_accuracy: number;
    requires_mission: boolean;
    final_roleplay_minimum_task_completion: number;
  };
};

export const masteryRules = courseManifest.mastery_rules;
export const reviewSchedule = courseManifest.review_schedule;

/** Checkpoint lessons close each week (day 7, 14, 21, 28). */
const CHECKPOINT_IDS = new Set(courseManifest.weeks.map((w) => w.checkpoint_lesson_id));
export function isCheckpointLesson(lessonId: string) {
  return CHECKPOINT_IDS.has(lessonId);
}

/** Accuracy a lesson must hit before the next node on the map unlocks. */
export function passThreshold(lessonId: string) {
  return isCheckpointLesson(lessonId)
    ? masteryRules.weekly_checkpoint_accuracy
    : masteryRules.daily_exit_accuracy;
}


export const courseWeeks: { week: number; title: string; lessons: CourseLesson[] }[] = WEEKS.map(
  (w) => ({
    week: w.week,
    title: w.title,
    lessons: w.lessons.map((l) => ({ ...l, week: w.week, weekTitle: w.title })),
  }),
);

export const courseLessons: CourseLesson[] = courseWeeks
  .flatMap((w) => w.lessons)
  .sort((a, b) => a.day - b.day);

export type DailyChallenge = {
  id: string;
  title: string;
  course_day: string;
  prompt: string;
  target_pattern: string;
  review_tags: string[];
  estimated_minutes: number;
};
export const dailyChallenges = (dailyRaw as unknown as { challenges: DailyChallenge[] }).challenges;

export type SpecialChallenge = {
  id: string;
  title: string;
  unlock_after_day: number;
  scenario: string;
  required_language: string[];
  success_criteria: string[];
};
export const specialChallenges = (specialRaw as unknown as { challenges: SpecialChallenge[] })
  .challenges;

/** Key used in the store's completedDays for a course lesson. */
export function courseKey(lessonId: string) {
  return `course:${lessonId}`;
}
export function lessonIdFromKey(key: string) {
  return key.startsWith("course:") ? key.slice(7) : null;
}
export function lessonById(id: string) {
  return courseLessons.find((l) => l.id === id);
}
export function challengeForDay(day: number) {
  return dailyChallenges.find((c) => c.course_day === `Day ${day}`);
}
export function unlockedSpecials(day: number) {
  return specialChallenges.filter((c) => c.unlock_after_day <= day);
}

/** True when the authored 28-day course applies to this language. */
export function hasCourse(langId: string) {
  return langId === courseLangId;
}

/* ── Activity shaping ────────────────────────────────────────────────── */

export type ActivityMode = "choice" | "write" | "order" | "match" | "speak" | "roleplay";

const SPEAK_TYPES = ["speak", "shadowing", "translation_chain"];
const ROLEPLAY_TYPES = ["roleplay", "final_roleplay"];

export function activityMode(a: CourseActivity): ActivityMode {
  if (ROLEPLAY_TYPES.includes(a.type)) return "roleplay";
  if (a.type === "matching") return "match";
  if (a.type === "ordering") return "order";
  if (SPEAK_TYPES.includes(a.type)) return "speak";
  if (a.options && a.options.length > 1) return "choice";
  return "write";
}

/** Listening-first activities: the prompt audio is the question. */
export function activityIsListening(a: CourseActivity) {
  return a.type.startsWith("listen");
}

/** Activities whose "answer" is a behavioural marker rather than text. */
export function isBehavioural(a: CourseActivity) {
  return /^[a-z_]+$/.test(a.answer) && a.answer.includes("_") && !a.answer.includes(" ");
}

/** Answers containing ____ are templates the learner fills with their own words. */
export function isTemplate(a: CourseActivity) {
  return a.answer.includes("__");
}

export function matchPairs(a: CourseActivity): { left: string; right: string }[] {
  return a.answer
    .split(";")
    .map((chunk) => chunk.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .map((chunk) => {
      const [left, right] = chunk.split("=");
      return { left: (left ?? "").trim(), right: (right ?? "").trim() };
    })
    .filter((p) => p.left && p.right);
}

export function orderTokens(a: CourseActivity): string[] {
  return a.answer.split(/\s+/).filter(Boolean);
}

export function acceptedAnswers(a: CourseActivity): string[] {
  return [a.answer, ...(a.accepted_answers ?? [])];
}

/** Spanish text spoken for an activity, when there is something meaningful to hear. */
export function activityAudio(a: CourseActivity): string | null {
  if (isBehavioural(a)) return null;
  const mode = activityMode(a);
  if (mode === "match" || mode === "order") return null;
  return a.answer.replace(/_+/g, "…");
}
