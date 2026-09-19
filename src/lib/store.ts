import { create } from "zustand";
import { persist } from "zustand/middleware";
import { gamification, clearanceForXp } from "@/lib/content";
import { newCard, scheduleGraded, type Outcome, type SrsCard } from "@/lib/srs";

export type Profile = {
  callsign: string;
  langId: string;
  timelineId: string;
  tierId: string;
  personaId: string;
  discoverySource?: string;
  startingLevel?: string;
  startedAt: number;
};

export type Quest = { id: string; label: string; reward_xp: number; done: boolean };

export type SessionSummary = {
  date: number;
  dayKey: string;
  xp: number;
  accuracy: number;
  items: number;
  coverIntact: boolean;
  /** Did the run meet the mastery threshold that unlocks the next node? */
  passed?: boolean;
};

type State = {
  profile: Profile | null;
  xp: number;
  weeklyXp: number;
  credits: number;
  streak: number;
  lastActiveDay: string | null;
  longestStreak: number;
  freezes: number;
  /** Shop items owned, by item id. One-time unlocks sit at 1. */
  inventory: Record<string, number>;
  badges: string[];
  cards: Record<string, SrsCard>;
  completedDays: string[];
  history: SessionSummary[];
  quests: { day: string; list: Quest[] };
  leagueTier: number;
  ghostSeed: number;
  stsStreak: number;
  shadowReps: number;
  perfectWeek: boolean;
  settings: { rate: number; captions: boolean };
  lastLoginDay: string | null;
  cloudSyncActive: boolean;
  cloudUserId: string | null;
  challengesDone: string[];
  /** Day keys the operative has checked in on. */
  checkIns: string[];
  checkInPoints: number;
  lastCheckIn: string | null;
  /** Week numbers whose recall simulation has been cleared. */
  weeklyRecallDone: number[];

  /** First-run walkthrough: -1 = not running. */
  tutorialStep: number;
  tutorialDone: boolean;

  /** Streak goal the learner committed to, in days. Null until they commit. */
  streakGoal: number | null;
  /** Has the first-streak celebration been shown? */
  streakCelebrated: boolean;

  /** Who your language partner is. Null until they pick one. */
  companion: CompanionConfig | null;
  /** What the AI remembers you keep getting wrong. */
  mistakeMemory: Record<string, MistakeNote>;



  setProfile: (p: Profile) => void;
  resetAll: () => void;
  todayKey: () => string;
  registerLogin: () => void;
  addXp: (n: number) => void;
  spend: (n: number) => boolean;
  purchase: (id: string, cost: number) => boolean;
  grantBadge: (id: string) => void;
  reviewCard: (id: string, outcome: Outcome | boolean) => void;
  completeChallenge: (id: string, xp: number) => void;
  seedCards: (items: { id: string; target: string; translation: string }[], lang: string) => void;
  completeSession: (s: SessionSummary, questFlags: Record<string, boolean>) => void;
  bumpSts: (correct: boolean) => void;
  bumpShadow: () => void;
  setSetting: <K extends keyof State["settings"]>(k: K, v: State["settings"][K]) => void;
  setCloudSync: (active: boolean, userId: string | null) => void;
  checkIn: () => CheckInResult | null;
  completeWeeklyRecall: (week: number, xp: number) => void;
  setCompanion: (c: Partial<CompanionConfig>) => void;
  noteMistake: (tag: string, detail: string) => void;
  startTutorial: () => void;
  setTutorialStep: (n: number) => void;
  endTutorial: () => void;
  markStreakCelebrated: () => void;
  commitStreakGoal: (days: number, reward: number) => void;
};

export type CompanionConfig = {
  personalityId: string;
  characterId: string;
  /** 0-3 how much street slang they use. */
  slang: number;
  /** 0-3 roast intensity when you get it wrong. */
  roast: number;
  /** Teach how people actually speak instead of textbook forms. */
  localMode: boolean;
  /** They never translate unless you ask. */
  noTranslate: boolean;
};

export type MistakeNote = { tag: string; detail: string; count: number; lastAt: number };


export type CheckInResult = {
  day: string;
  points: number;
  bonuses: { label: string; points: number }[];
  weekCount: number;
  monthCount: number;
};


function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday-anchored week key, e.g. 2026-W35. */
export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const week =
    1 + Math.round(((t.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}


function pickQuests(): Quest[] {
  const all = gamification.daily_quest_templates as { id: string; label: string; reward_xp: number }[];
  const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 3);
  return shuffled.map((q) => ({ ...q, done: false }));
}

const initial = {
  profile: null,
  xp: 0,
  weeklyXp: 0,
  credits: 50,
  streak: 0,
  lastActiveDay: null,
  longestStreak: 0,
  freezes: 0,
  inventory: {} as Record<string, number>,
  badges: [] as string[],
  cards: {} as Record<string, SrsCard>,
  completedDays: [] as string[],
  history: [] as SessionSummary[],
  quests: { day: "", list: [] as Quest[] },
  leagueTier: 1,
  ghostSeed: Math.floor(Math.random() * 1000),
  stsStreak: 0,
  shadowReps: 0,
  perfectWeek: true,
  settings: { rate: 1, captions: true },
  lastLoginDay: null,
  cloudSyncActive: false,
  cloudUserId: null,
  challengesDone: [] as string[],
  checkIns: [] as string[],
  checkInPoints: 0,
  lastCheckIn: null,
  weeklyRecallDone: [] as number[],
  companion: null as CompanionConfig | null,
  mistakeMemory: {} as Record<string, MistakeNote>,
  tutorialStep: -1,
  tutorialDone: false,
  streakGoal: null as number | null,
  streakCelebrated: false,


};


export const useApp = create<State>()(
  persist(
    (set, get) => ({
      ...initial,

      setProfile: (p) => set({ profile: p }),
      resetAll: () => set({ ...initial, ghostSeed: Math.floor(Math.random() * 1000) }),
      todayKey: () => dayKey(),

      registerLogin: () => {
        const today = dayKey();
        const s = get();
        if (s.lastLoginDay === today && s.quests.day === today) return;
        const patch: Partial<State> = { lastLoginDay: today };
        if (s.lastLoginDay !== today) patch.credits = s.credits + gamification.currency.earn_rules.daily_login;
        if (s.quests.day !== today) patch.quests = { day: today, list: pickQuests() };
        set(patch as State);
      },

      addXp: (n) =>
        set((s) => {
          const xp = s.xp + n;
          const creditsEarned = Math.floor(xp / 20) - Math.floor(s.xp / 20);
          return { xp, weeklyXp: s.weeklyXp + n, credits: s.credits + creditsEarned };
        }),

      spend: (n) => {
        if (get().credits < n) return false;
        set((s) => ({ credits: s.credits - n }));
        return true;
      },

      purchase: (id, cost) => {
        const s = get();
        if (s.credits < cost) return false;
        set({
          credits: s.credits - cost,
          inventory: { ...s.inventory, [id]: (s.inventory[id] ?? 0) + 1 },
          freezes: id === "cover_extension" ? s.freezes + 1 : s.freezes,
        });
        return true;
      },

      grantBadge: (id) =>
        set((s) => (s.badges.includes(id) ? s : { badges: [...s.badges, id] })),

      seedCards: (items, lang) =>
        set((s) => {
          const cards = { ...s.cards };
          for (const it of items) {
            if (!cards[it.id]) cards[it.id] = newCard(it.id, it.target, it.translation, lang);
          }
          return { cards };
        }),

      reviewCard: (id, outcome) =>
        set((s) => {
          const card = s.cards[id];
          if (!card) return s;
          const graded: Outcome =
            typeof outcome === "boolean" ? (outcome ? "correct" : "wrong") : outcome;
          return { cards: { ...s.cards, [id]: scheduleGraded(card, graded) } };
        }),

      completeChallenge: (id, xp) =>
        set((s) =>
          s.challengesDone.includes(id)
            ? s
            : {
                challengesDone: [...s.challengesDone, id],
                xp: s.xp + xp,
                weeklyXp: s.weeklyXp + xp,
              },
        ),

      bumpSts: (correct) =>
        set((s) => {
          const stsStreak = correct ? s.stsStreak + 1 : 0;
          const badges = stsStreak >= 10 && !s.badges.includes("silver_tongue")
            ? [...s.badges, "silver_tongue"]
            : s.badges;
          return { stsStreak, badges };
        }),

      checkIn: () => {
        const s = get();
        const today = dayKey();
        if (s.checkIns.includes(today)) return null;

        const checkIns = [...s.checkIns, today];
        const wk = weekKey();
        const mk = monthKey();
        const weekCount = checkIns.filter((d) => weekKey(new Date(d)) === wk).length;
        const monthCount = checkIns.filter((d) => d.startsWith(mk)).length;

        const bonuses: { label: string; points: number }[] = [];
        let points = 10;
        if (weekCount === 7) bonuses.push({ label: "PERFECT WEEK", points: 70 });
        if (weekCount % 3 === 0 && weekCount < 7) bonuses.push({ label: "3-DAY WEEK STREAK", points: 15 });
        if (monthCount === 20) bonuses.push({ label: "MONTHLY DEDICATION", points: 250 });
        if (monthCount === 28) bonuses.push({ label: "FULL MONTH", points: 500 });
        points += bonuses.reduce((a, b) => a + b.points, 0);

        set({
          checkIns,
          lastCheckIn: today,
          checkInPoints: s.checkInPoints + points,
          credits: s.credits + Math.round(points / 5),
        });
        return { day: today, points, bonuses, weekCount, monthCount };
      },

      completeWeeklyRecall: (week, xp) =>
        set((s) =>
          s.weeklyRecallDone.includes(week)
            ? s
            : {
                weeklyRecallDone: [...s.weeklyRecallDone, week],
                xp: s.xp + xp,
                weeklyXp: s.weeklyXp + xp,
                badges: s.badges.includes("total_recall") ? s.badges : [...s.badges, "total_recall"],
              },
        ),

      bumpShadow: () =>
        set((s) => {
          const shadowReps = s.shadowReps + 1;
          const badges = shadowReps >= 50 && !s.badges.includes("the_shadow")
            ? [...s.badges, "the_shadow"]
            : s.badges;
          return { shadowReps, badges };
        }),

      setSetting: (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v } })),

      markStreakCelebrated: () => set({ streakCelebrated: true }),

      commitStreakGoal: (days, reward) =>
        set((s) => ({
          streakGoal: days,
          streakCelebrated: true,
          credits: s.credits + reward,
        })),

      setCloudSync: (active, userId) => set({ cloudSyncActive: active, cloudUserId: userId }),

      setCompanion: (c) =>
        set((s) => ({
          companion: {
            personalityId: "tutor",
            characterId: "sofia",
            slang: 1,
            roast: 1,
            localMode: true,
            noTranslate: false,
            ...(s.companion ?? {}),
            ...c,
          },
        })),

      startTutorial: () =>
        set((s) => (s.tutorialDone || s.tutorialStep >= 0 ? s : { tutorialStep: 0 })),

      setTutorialStep: (n) => set({ tutorialStep: n }),

      endTutorial: () => set({ tutorialStep: -1, tutorialDone: true }),

      noteMistake: (tag, detail) =>
        set((s) => {
          const key = tag.toLowerCase().slice(0, 40);
          const prev = s.mistakeMemory[key];
          return {
            mistakeMemory: {
              ...s.mistakeMemory,
              [key]: {
                tag: key,
                detail: detail.slice(0, 160),
                count: (prev?.count ?? 0) + 1,
                lastAt: Date.now(),
              },
            },
          };
        }),


      completeSession: (summary, questFlags) => {
        const s = get();
        const today = dayKey();
        const yesterday = dayKey(new Date(Date.now() - 86400000));
        const gapDays = s.lastActiveDay
          ? Math.round((Date.parse(today) - Date.parse(s.lastActiveDay)) / 86400000)
          : 0;

        let streak = s.streak;
        if (s.lastActiveDay !== today) {
          streak = s.lastActiveDay === yesterday ? s.streak + 1 : 1;
        }

        const badges = new Set(s.badges);
        if (s.completedDays.length === 0) badges.add("first_contact");
        const hour = new Date().getHours();
        if (hour >= 22 || hour < 4) badges.add("night_shift");
        if (hour < 7) badges.add("dawn_patrol");
        if (streak >= 30) badges.add("ghost_protocol");
        if (streak >= 90) badges.add("deep_cover_operative");
        if (streak >= 180) badges.add("directors_circle");
        if (gapDays >= 7) badges.add("comeback_asset");
        if (summary.accuracy >= 0.9 && summary.coverIntact) badges.add("quick_study");

        // Streak milestone credits
        let credits = s.credits;
        const milestones: Record<number, number> = { 7: 25, 30: 50, 90: 100 };
        if (s.lastActiveDay !== today && milestones[streak]) credits += milestones[streak]!;

        // Daily quests
        const list = s.quests.list.map((q) =>
          q.done || !questFlags[q.id] ? q : { ...q, done: true },
        );
        const questXp = list.reduce(
          (acc, q, i) => acc + (q.done && !s.quests.list[i]!.done ? q.reward_xp : 0),
          0,
        );

        const totalXp = summary.xp + questXp;
        const creditsEarned = Math.floor((s.xp + totalXp) / 20) - Math.floor(s.xp / 20);

        // Mastery gating: a node only unlocks the next one when the run passed.
        const unlocks = summary.passed !== false && summary.dayKey !== "review";
        const completedDays =
          !unlocks || s.completedDays.includes(summary.dayKey)
            ? s.completedDays
            : [...s.completedDays, summary.dayKey];

        if (completedDays.filter((d) => d.startsWith("arc_1")).length >= 3)
          badges.add("border_crosser");

        set({
          xp: s.xp + totalXp,
          weeklyXp: s.weeklyXp + totalXp,
          credits: credits + creditsEarned,
          streak,
          longestStreak: Math.max(s.longestStreak, streak),
          lastActiveDay: today,
          badges: [...badges],
          completedDays,
          quests: { day: today, list },
          history: [{ ...summary, xp: totalXp }, ...s.history].slice(0, 30),
        });
      },
    }),
    { name: "operation-lingua-v1" },
  ),
);

export function useLevel() {
  const xp = useApp((s) => s.xp);
  return clearanceForXp(xp);
}
