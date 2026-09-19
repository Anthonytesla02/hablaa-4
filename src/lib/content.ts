import raw from "@/data/content.json";

export type Lang = {
  id: string;
  label: string;
  flag_emoji: string;
  dli_category: string;
  category_multiplier: number;
};
export type Timeline = { id: string; label: string; days: number; new_content_day_ratio: number };
export type Tier = {
  id: string;
  label: string;
  minutes: number;
  session_composition: Record<string, number>;
  approx_new_items_per_session: string;
};
export type Persona = { id: string; label: string; description: string; priority_arcs: string[] };
export type LevelLevel = {
  level: number;
  codename: string;
  ilr_equivalent: string;
  cefr_approx: string;
  can_do_summary: string;
};

export type Item = { id: string; target: string; translation: string };
export type PatternDrill = {
  id: string;
  structure: string;
  structure_translation: string;
  base_example: { target: string; translation: string };
  substitutions: { target: string; translation: string }[];
};
export type McqOption = { id: string; target: string; translation: string };
export type Mcq = {
  id: string;
  type: string;
  audio_prompt_target: string;
  audio_prompt_translation: string;
  options: McqOption[];
  correct_option_id: string;
};
export type Shadow = {
  id: string;
  target_text: string;
  translation: string;
  recommended_reps: number;
  playback_speeds: number[];
};
export type Sts = {
  id: string;
  scenario_context: string;
  scenario_context_translation: string;
  ai_character: string;
  ai_prompt_target: string;
  ai_prompt_translation: string;
  expected_answers: { target: string; translation: string }[];
  evaluation_rubric: { core_pattern_hit: string; comprehension: string };
  on_success_ai_response_target: string;
  on_success_ai_response_translation: string;
  on_struggle_ai_response_target?: string;
  on_struggle_ai_response_translation?: string;
  hint_target?: string;
};
export type Dictation = {
  id: string;
  audio_target: string;
  correct_transcription: string;
  acceptable_variants: string[];
  translation: string;
};
export type MissionDay = {
  day_number: number;
  theme: string;
  learning_objectives: string[];
  new_items: Item[];
  pattern_drills: PatternDrill[];
  tts_multiple_choice: Mcq[];
  shadowing_drills: Shadow[];
  speech_to_speech: Sts[];
  dictation: Dictation[];
};

const data = raw as unknown as {
  onboarding_config: {
    target_languages: Lang[];
    goal_timelines: Timeline[];
    daily_commitment_tiers: Tier[];
    operational_personas: Persona[];
  };
  clearance_levels: LevelLevel[];
  gamification: any;
  srs_engine: any;
  mission_arcs_overview: { id: string; order: number; title: string; theme: string }[];
  curriculum: Record<string, Record<string, Record<string, any>>>;
  phrase_bank: Record<string, { target?: string; translation?: string }[]>;
};

/** Friendly, non-spy display names layered over the raw content data. */
const LEVEL_NAMES: Record<number, string> = {
  0: "Just Starting",
  0.5: "First Words",
  1: "Getting Chatty",
  1.5: "Everyday Talk",
  2: "Confident",
  2.5: "Really Fluent",
  3: "Fluent Speaker",
};

const GOAL_LABELS: Record<string, { label: string; description: string }> = {
  undercover_traveler: { label: "Travel & Explore", description: "Trips, transport, hotels, food and money." },
  corporate_diplomat: { label: "Work & Business", description: "Meetings, polite register, professional small talk." },
  intelligence_operative: { label: "Confident in a Pinch", description: "Emergencies, awkward moments, thinking on your feet." },
  local_resident: { label: "Living Abroad", description: "Paperwork, housing, utilities, doctors." },
  humanitarian_field_worker: { label: "Helping & Care Work", description: "Medical, coordination, practical vocabulary." },
};

const ARC_LABELS: Record<string, string> = {
  arc_1_arrival_and_survival: "First Hellos",
  arc_2_movement_and_navigation: "Getting Around",
  arc_3_sustenance_and_commerce: "Food & Shopping",
  arc_4_contact_and_communication: "Meeting People",
  arc_5_lodging_and_logistics: "Where You Stay",
  arc_6_crisis_and_emergency: "When Things Go Wrong",
  arc_7_work_and_negotiation: "Work Talk",
  arc_8_deep_cover: "Real Conversation",
};

const TIER_LABELS: Record<string, string> = {
  recon_10: "Quick",
  field_op_30: "Steady",
  full_deployment_60: "All In",
};

const TIMELINE_LABELS: Record<string, string> = {
  sprint_30: "30-Day Sprint",
  intensive_60: "60-Day Intensive",
  standard_90: "90-Day Standard",
  mastery_180: "180-Day Mastery",
};

export const onboarding = {
  ...data.onboarding_config,
  daily_commitment_tiers: data.onboarding_config.daily_commitment_tiers.map((t) => ({
    ...t,
    label: TIER_LABELS[t.id] ?? t.label,
  })),
  goal_timelines: data.onboarding_config.goal_timelines.map((t) => ({
    ...t,
    label: TIMELINE_LABELS[t.id] ?? t.label,
  })),
  operational_personas: data.onboarding_config.operational_personas.map((p) => ({
    ...p,
    label: GOAL_LABELS[p.id]?.label ?? p.label,
    description: GOAL_LABELS[p.id]?.description ?? p.description,
  })),
};
export const clearanceLevels = data.clearance_levels.map((c) => ({
  ...c,
  codename: LEVEL_NAMES[c.level] ?? c.codename,
}));

const BADGE_LABELS: Record<string, { label: string; unlock_condition?: string }> = {
  first_contact: { label: "First Hello" },
  border_crosser: { label: "Off the Plane", unlock_condition: "Finish the First Hellos unit." },
  iron_cover: { label: "Flawless Week", unlock_condition: "Finish a full week without a single slip." },
  ghost_protocol: { label: "30-Day Streak", unlock_condition: "Keep a 30-day streak." },
  deep_cover_operative: { label: "90-Day Streak", unlock_condition: "Keep a 90-day streak." },
  directors_circle: { label: "180-Day Streak", unlock_condition: "Keep a 180-day streak." },
  polyglot_handler: { label: "Polyglot", unlock_condition: "Active streaks in 2+ languages at once." },
  fluent_interrogator: { label: "Smooth Talker", unlock_condition: "Pass a big test on the first try." },
  quick_study: { label: "Quick Study", unlock_condition: "Finish a lesson in half the time at 90%+ accuracy." },
  comeback_asset: { label: "Welcome Back", unlock_condition: "Come back and finish a lesson after a break." },
  culture_briefed: { label: "Culture Buff", unlock_condition: "Read every culture note in a unit." },
};

const LEAGUE_NAMES = [
  "Sprouts",
  "Chatters",
  "Explorers",
  "Regulars",
  "Naturals",
  "Stars",
  "Legends",
];

export const gamification = {
  ...data.gamification,
  currency: { ...data.gamification.currency, name: "Coins" },
  streak: { ...data.gamification.streak, name: "Daily Streak" },
  league_ranks: (data.gamification.league_ranks as { tier: number; name: string }[]).map((r, i) => ({
    ...r,
    name: LEAGUE_NAMES[i] ?? r.name,
  })),
  badges: (data.gamification.badges as { id: string; label: string; unlock_condition: string }[]).map(
    (b) => ({
      ...b,
      label: BADGE_LABELS[b.id]?.label ?? b.label,
      unlock_condition: BADGE_LABELS[b.id]?.unlock_condition ?? b.unlock_condition,
    }),
  ),
};
export const srsEngine = data.srs_engine;
export const arcs = data.mission_arcs_overview.map((a) => ({
  ...a,
  title: ARC_LABELS[a.id] ?? a.title,
}));
export const curriculum = data.curriculum;
export const phraseBank = data.phrase_bank;

export const languages = onboarding.target_languages;
export const authoredLanguages = Object.keys(curriculum);

export function langById(id: string) {
  return languages.find((l) => l.id === id);
}

export function bcp47(langId: string) {
  const map: Record<string, string> = {
    spanish: "es-ES",
    french: "fr-FR",
    italian: "it-IT",
    portuguese: "pt-PT",
    german: "de-DE",
    russian: "ru-RU",
    arabic: "ar-SA",
    mandarin: "zh-CN",
    japanese: "ja-JP",
    korean: "ko-KR",
  };
  return map[langId] ?? "en-US";
}

/** Mission days available for a language, in order. */
export function missionDays(langId: string): { arcId: string; key: string; day: MissionDay }[] {
  const arcsForLang = curriculum[langId] ?? {};
  const out: { arcId: string; key: string; day: MissionDay }[] = [];
  for (const arc of arcs) {
    const arcData = arcsForLang[arc.id];
    if (!arcData) continue;
    Object.keys(arcData)
      .filter((k) => k.startsWith("day_"))
      .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))
      .forEach((k) => out.push({ arcId: arc.id, key: `${arc.id}:${k}`, day: arcData[k] as MissionDay }));
  }
  return out;
}

export function arcTitle(arcId: string) {
  return arcs.find((a) => a.id === arcId)?.title ?? arcId;
}

/** Adjusted-hours → clearance estimate (spec 5.3). */
export function projectedLevel(langId: string, timelineId: string, tierId: string) {
  const lang = langById(langId);
  const tl = onboarding.goal_timelines.find((t) => t.id === timelineId);
  const tier = onboarding.daily_commitment_tiers.find((t) => t.id === tierId);
  if (!lang || !tl || !tier) return clearanceLevels[0]!;
  const hours = (tl.days * tier.minutes) / 60 / lang.category_multiplier;
  const bands: [number, number][] = [
    [8, 0.5],
    [25, 1],
    [60, 1.5],
    [120, 2],
    [250, 2.5],
  ];
  let level = 3;
  for (const [h, lvl] of bands) {
    if (hours < h) {
      level = lvl;
      break;
    }
  }
  return clearanceLevels.find((c) => c.level === level) ?? clearanceLevels[0]!;
}

export function clearanceForXp(xp: number) {
  const thresholds: [number, number][] = [
    [0, 0],
    [400, 0.5],
    [1500, 1],
    [4000, 1.5],
    [9000, 2],
    [18000, 2.5],
    [32000, 3],
  ];
  let level = 0;
  for (const [x, lvl] of thresholds) if (xp >= x) level = lvl;
  const next = thresholds.find(([, lvl]) => lvl > level);
  const current = clearanceLevels.find((c) => c.level === level) ?? clearanceLevels[0]!;
  const prevX = thresholds.find(([, lvl]) => lvl === level)![0];
  return {
    current,
    next: next ? clearanceLevels.find((c) => c.level === next[1]) : undefined,
    progress: next ? Math.min(1, (xp - prevX) / (next[0] - prevX)) : 1,
    nextAt: next?.[0],
  };
}
