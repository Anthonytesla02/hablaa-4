import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";

export type BackupFile = {
  format: "operation-lingua-backup";
  version: 1;
  exportedAt: string;
  sourceUserId: string;
  local: Record<string, unknown>;
  database: {
    profiles: Record<string, unknown>[];
    srs_cards: Record<string, unknown>[];
    completed_days: Record<string, unknown>[];
    session_history: Record<string, unknown>[];
  };
  counts: Record<string, number>;
};

export type RestoreReport = { table: string; rows: number; error?: string }[];

const LOCAL_SKIP = new Set(["cloudSyncActive", "cloudUserId"]);

function localSnapshot(): Record<string, unknown> {
  const s = useApp.getState() as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (typeof v === "function" || LOCAL_SKIP.has(k)) continue;
    out[k] = v;
  }
  return out;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("You need to be signed in.");
  return id;
}

/** Read everything for the signed-in user and build a portable backup object. */
export async function buildBackup(): Promise<BackupFile> {
  const userId = await currentUserId();

  const [profiles, cards, days, history] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId),
    supabase.from("srs_cards").select("*").eq("user_id", userId),
    supabase.from("completed_days").select("*").eq("user_id", userId),
    supabase.from("session_history").select("*").eq("user_id", userId),
  ]);

  const database = {
    profiles: (profiles.data ?? []) as Record<string, unknown>[],
    srs_cards: (cards.data ?? []) as Record<string, unknown>[],
    completed_days: (days.data ?? []) as Record<string, unknown>[],
    session_history: (history.data ?? []) as Record<string, unknown>[],
  };

  return {
    format: "operation-lingua-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    sourceUserId: userId,
    local: localSnapshot(),
    database,
    counts: Object.fromEntries(Object.entries(database).map(([k, v]) => [k, v.length])),
  };
}

export function backupFilename(b: BackupFile): string {
  const stamp = b.exportedAt.replace(/[:.]/g, "-").replace("T", "-").slice(0, 19);
  return `operation-lingua-backup-${stamp}.json`;
}

export function downloadBackup(b: BackupFile): void {
  const blob = new Blob([JSON.stringify(b, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFilename(b);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Validate and parse a picked file. Throws a friendly message when it's not a backup. */
export async function parseBackupFile(file: File): Promise<BackupFile> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't readable JSON.");
  }
  const b = json as BackupFile;
  if (!b || b.format !== "operation-lingua-backup" || !b.database) {
    throw new Error("That file isn't a Habla backup.");
  }
  for (const t of ["profiles", "srs_cards", "completed_days", "session_history"] as const) {
    if (!Array.isArray(b.database[t])) b.database[t] = [];
  }
  return b;
}

function rekey(row: Record<string, unknown>, userId: string, drop: string[] = []) {
  const out: Record<string, unknown> = { ...row, user_id: userId };
  for (const k of ["created_at", "updated_at", ...drop]) delete out[k];
  return out;
}

/**
 * Restore a backup into the signed-in account.
 * Replaces the user's cards / completed days / history, then hydrates the device store.
 */
export async function restoreBackup(b: BackupFile): Promise<RestoreReport> {
  const userId = await currentUserId();
  const report: RestoreReport = [];
  const db = b.database;

  // 1. clear existing rows for this user
  await Promise.all([
    supabase.from("srs_cards").delete().eq("user_id", userId),
    supabase.from("completed_days").delete().eq("user_id", userId),
    supabase.from("session_history").delete().eq("user_id", userId),
  ]);

  // 2. profile
  const profileRow = db.profiles[0];
  if (profileRow) {
    const { error } = await supabase
      .from("profiles")
      .upsert(rekey(profileRow, userId) as never, { onConflict: "user_id" });
    report.push({ table: "Profile", rows: 1, ...(error ? { error: error.message } : {}) });
  }

  // 3. cards
  if (db.srs_cards.length) {
    const rows = db.srs_cards.map((r) => rekey(r, userId));
    const { error } = await supabase
      .from("srs_cards")
      .upsert(rows as never, { onConflict: "user_id,id" });
    report.push({
      table: "Practice cards",
      rows: rows.length,
      ...(error ? { error: error.message } : {}),
    });
  }

  // 4. completed days
  if (db.completed_days.length) {
    const rows = db.completed_days.map((r) => rekey(r, userId));
    const { error } = await supabase
      .from("completed_days")
      .upsert(rows as never, { onConflict: "user_id,day_key" });
    report.push({
      table: "Completed lessons",
      rows: rows.length,
      ...(error ? { error: error.message } : {}),
    });
  }

  // 5. history (new ids in the target project)
  if (db.session_history.length) {
    const rows = db.session_history.map((r) => rekey(r, userId, ["id"]));
    const { error } = await supabase.from("session_history").insert(rows as never);
    report.push({
      table: "Session history",
      rows: rows.length,
      ...(error ? { error: error.message } : {}),
    });
  }

  // 6. hydrate the on-device store
  if (b.local && typeof b.local === "object") {
    const local = { ...b.local } as Record<string, unknown>;
    for (const k of LOCAL_SKIP) delete local[k];
    useApp.setState(local as never);
  }
  useApp.getState().setCloudSync(true, userId);
  report.push({ table: "On-device progress", rows: 1 });

  return report;
}
