import { supabase } from "@/integrations/supabase/client";
import { useApp, type Profile, type Quest, type SessionSummary } from "@/lib/store";
import type { SrsCard } from "@/lib/srs";

export type CloudState = {
  profile: Profile | null;
  xp: number;
  weeklyXp: number;
  credits: number;
  streak: number;
  longestStreak: number;
  lastActiveDay: string | null;
  lastLoginDay: string | null;
  freezes: number;
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
};

/** Load all state from Supabase and hydrate the Zustand store. */
export async function syncFromCloud(userId: string): Promise<void> {
  const store = useApp.getState();

  // Load profile + progress
  const { data: profileRow } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();

  // Load SRS cards
  const { data: cardRows } = await supabase.from("srs_cards").select("*").eq("user_id", userId);

  // Load completed days
  const { data: dayRows } = await supabase.from("completed_days").select("day_key").eq("user_id", userId);

  // Load session history
  const { data: histRows } = await supabase
    .from("session_history")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(30);

  if (profileRow) {
    // Never let a stale cloud row wipe progress that is already ahead locally
    // (e.g. a debounced save that has not landed yet).
    const keepMax = <K extends "xp" | "weeklyXp" | "credits" | "streak" | "longestStreak">(
      key: K,
      cloudValue: number,
    ) => Math.max(cloudValue ?? 0, (store[key] as number) ?? 0);
    const cards: Record<string, SrsCard> = {};
    for (const c of cardRows ?? []) {
      cards[c.id] = {
        id: c.id,
        target: c.target,
        translation: c.translation,
        lang: c.lang,
        ease: c.ease,
        intervalDays: c.interval_days,
        dueAt: c.due_at,
        reps: c.reps,
        lapses: c.lapses,
      };
    }

    useApp.setState({
      profile: {
        callsign: profileRow.callsign,
        langId: profileRow.lang_id,
        timelineId: profileRow.timeline_id,
        tierId: profileRow.tier_id,
        personaId: profileRow.persona_id,
        ...(store.profile?.discoverySource
          ? { discoverySource: store.profile.discoverySource }
          : {}),
        ...(store.profile?.startingLevel ? { startingLevel: store.profile.startingLevel } : {}),
        startedAt: profileRow.started_at,
      },
      xp: keepMax("xp", profileRow.xp),
      weeklyXp: keepMax("weeklyXp", profileRow.weekly_xp),
      credits: keepMax("credits", profileRow.credits),
      streak: keepMax("streak", profileRow.streak),
      longestStreak: keepMax("longestStreak", profileRow.longest_streak),
      lastActiveDay: profileRow.last_active_day ?? store.lastActiveDay,
      lastLoginDay: profileRow.last_login_day,
      freezes: profileRow.freezes,
      badges: profileRow.badges,
      cards,
      completedDays: (dayRows ?? []).map((r) => r.day_key),
      history: (histRows ?? []).map((h) => ({
        date: h.date,
        dayKey: h.day_key,
        xp: h.xp,
        accuracy: h.accuracy,
        items: h.items,
        coverIntact: h.cover_intact,
      })),
      quests: profileRow.quests as { day: string; list: Quest[] },
      leagueTier: profileRow.league_tier,
      ghostSeed: profileRow.ghost_seed,
      stsStreak: profileRow.sts_streak,
      shadowReps: profileRow.shadow_reps,
      perfectWeek: profileRow.perfect_week,
      settings: profileRow.settings as { rate: number; captions: boolean },
    });
  }

  // Mark that cloud sync is active
  store.setCloudSync(true, userId);
}

/** Save full state to Supabase (upsert). */
export async function syncToCloud(userId: string): Promise<void> {
  const s = useApp.getState();
  if (!userId) return;

  const profile = s.profile;

  // Upsert profile row
  await supabase.from("profiles").upsert({
    user_id: userId,
    callsign: profile?.callsign ?? "",
    lang_id: profile?.langId ?? "spanish",
    timeline_id: profile?.timelineId ?? "standard_90",
    tier_id: profile?.tierId ?? "field_op_30",
    persona_id: profile?.personaId ?? "undercover_traveler",
    started_at: profile?.startedAt ?? 0,
    xp: s.xp,
    weekly_xp: s.weeklyXp,
    credits: s.credits,
    streak: s.streak,
    longest_streak: s.longestStreak,
    last_active_day: s.lastActiveDay,
    last_login_day: s.lastLoginDay,
    freezes: s.freezes,
    badges: s.badges,
    league_tier: s.leagueTier,
    ghost_seed: s.ghostSeed,
    sts_streak: s.stsStreak,
    shadow_reps: s.shadowReps,
    perfect_week: s.perfectWeek,
    settings: s.settings,
    quests: s.quests,
  });

  // Sync SRS cards — upsert all, then delete cards not in local state
  const localCardIds = new Set(Object.keys(s.cards));
  const cardInserts = Object.values(s.cards).map((c) => ({
    id: c.id,
    user_id: userId,
    lang: c.lang,
    target: c.target,
    translation: c.translation,
    due_at: c.dueAt,
    ease: c.ease,
    lapses: c.lapses,
    interval_days: c.intervalDays,
    reps: c.reps,
  }));

  if (cardInserts.length > 0) {
    await supabase.from("srs_cards").upsert(cardInserts, { onConflict: "user_id,id" });
  }

  // Delete cards that no longer exist locally (shouldn't normally happen)
  const { data: existingCards } = await supabase.from("srs_cards").select("id").eq("user_id", userId);
  const stale = (existingCards ?? []).filter((c) => !localCardIds.has(c.id)).map((c) => c.id);
  if (stale.length > 0) {
    await supabase.from("srs_cards").delete().eq("user_id", userId).in("id", stale);
  }

  // Sync completed days
  const { data: existingDays } = await supabase.from("completed_days").select("day_key").eq("user_id", userId);
  const existingSet = new Set((existingDays ?? []).map((d) => d.day_key));
  const newDays = s.completedDays.filter((d) => !existingSet.has(d));
  if (newDays.length > 0) {
    await supabase.from("completed_days").upsert(
      newDays.map((day_key) => ({ user_id: userId, day_key })),
      { onConflict: "user_id,day_key" },
    );
  }

  // Sync session history — only insert new sessions
  if (s.history.length > 0) {
    const latest = s.history[0];
    if (latest) {
      const { data: existingHist } = await supabase
        .from("session_history")
        .select("id")
        .eq("user_id", userId)
        .eq("date", latest.date)
        .limit(1);
      if (!existingHist || existingHist.length === 0) {
        await supabase.from("session_history").insert({
          user_id: userId,
          date: latest.date,
          day_key: latest.dayKey,
          xp: latest.xp,
          accuracy: latest.accuracy,
          items: latest.items,
          cover_intact: latest.coverIntact,
        });
      }
    }
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingUserId: string | null = null;

/** Debounced cloud save — call on state changes. */
export function scheduleCloudSave(userId: string): void {
  if (!userId) return;
  pendingUserId = userId;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void syncToCloud(userId);
  }, 700);
}

/** Save immediately if a debounced save is still waiting (tab hide / reload). */
export function flushCloudSave(): void {
  if (!pendingUserId || !saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  void syncToCloud(pendingUserId);
}
