import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Download, Loader2, Upload } from "lucide-react";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { sfx } from "@/lib/sfx";
import { Completion } from "@/components/Completion";
import {
  buildBackup,
  downloadBackup,
  parseBackupFile,
  restoreBackup,
  type BackupFile,
  type RestoreReport,
} from "@/lib/backup";

export const Route = createFileRoute("/_authenticated/backup")({
  head: () => ({
    meta: [
      { title: "Backup & Restore — Habla" },
      {
        name: "description",
        content:
          "Save a copy of your Habla progress as a file, or bring your XP, streak, badges and practice cards into another account.",
      },
      { property: "og:title", content: "Backup & Restore — Habla" },
      {
        property: "og:description",
        content: "Export your learning progress to a file and restore it anywhere.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Hydrated>
      <BackupPage />
    </Hydrated>
  ),
});

function BackupPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"export" | "restore" | null>(null);
  const [picked, setPicked] = useState<{ file: BackupFile; name: string } | null>(null);
  const [report, setReport] = useState<RestoreReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);

  async function onExport() {
    setError(null);
    setBusy("export");
    try {
      const b = await buildBackup();
      downloadBackup(b);
      sfx("complete");
      setCelebrate("Your backup file is downloading");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the backup.");
    } finally {
      setBusy(null);
    }
  }

  async function onPick(file: File) {
    setError(null);
    setReport(null);
    try {
      setPicked({ file: await parseBackupFile(file), name: file.name });
      sfx("tap");
    } catch (e) {
      setPicked(null);
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  }

  async function onRestore() {
    if (!picked) return;
    if (!confirm("Restore this backup? It replaces the progress in this account.")) return;
    setError(null);
    setBusy("restore");
    try {
      setReport(await restoreBackup(picked.file));
      sfx("complete");
      setCelebrate("Your progress is back");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppFrame>
      {celebrate && (
        <Completion title="All done!" subtitle={celebrate} onDone={() => setCelebrate(null)} />
      )}
      <button
        onClick={() => {
          sfx("tap");
          void navigate({ to: "/profile" });
        }}
        className="mb-3 flex items-center gap-1 text-[12px] font-extrabold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Profile
      </button>

      <h1 className="text-xl font-extrabold">Backup &amp; restore</h1>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Save everything you've earned to a file, then bring it back here or into another account.
      </p>

      <section className="paper-card mt-5 p-4">
        <p className="text-[13px] font-extrabold">Save a copy</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Downloads one file with your level, streak, badges, coins, practice cards and lesson
          history.
        </p>
        <button
          onClick={() => void onExport()}
          disabled={busy !== null}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-primary py-3 text-[13px] font-extrabold text-primary-foreground disabled:opacity-60"
        >
          {busy === "export" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download my backup
        </button>
      </section>

      <section className="paper-card mt-4 p-4">
        <p className="text-[13px] font-extrabold">Bring a backup in</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Pick a backup file. Restoring replaces whatever progress is in this account.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPick(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => {
            sfx("tap");
            fileRef.current?.click();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card py-3 text-[13px] font-extrabold"
        >
          <Upload className="h-4 w-4 text-secondary" /> Choose a file
        </button>

        {picked && (
          <div className="mt-3 rounded-2xl border-2 border-border bg-background/60 p-3">
            <p className="truncate text-[12px] font-extrabold">{picked.name}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Saved {new Date(picked.file.exportedAt).toLocaleString()}
            </p>
            <ul className="mt-2 space-y-0.5 text-[11px] font-bold">
              <li>Practice cards · {picked.file.database.srs_cards.length}</li>
              <li>Completed lessons · {picked.file.database.completed_days.length}</li>
              <li>Session history · {picked.file.database.session_history.length}</li>
            </ul>
            <button
              onClick={() => void onRestore()}
              disabled={busy !== null}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-secondary py-3 text-[13px] font-extrabold text-secondary-foreground disabled:opacity-60"
            >
              {busy === "restore" && <Loader2 className="h-4 w-4 animate-spin" />}
              Restore this backup
            </button>
          </div>
        )}
      </section>

      {error && (
        <p className="mt-4 rounded-2xl border-2 border-destructive/50 bg-destructive/10 p-3 text-[12px] font-bold text-destructive">
          {error}
        </p>
      )}

      {report && (
        <section className="paper-card mt-4 p-4">
          <p className="text-[13px] font-extrabold">Restore finished</p>
          <ul className="mt-2 space-y-1">
            {report.map((r) => (
              <li
                key={r.table}
                className="flex items-center justify-between rounded-xl border-2 border-border bg-card px-3 py-2 text-[11px] font-extrabold"
              >
                <span>{r.table}</span>
                <span className={r.error ? "text-destructive" : "text-primary"}>
                  {r.error ? r.error : `${r.rows} ✓`}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              sfx("tap");
              void navigate({ to: "/dashboard" });
            }}
            className="mt-3 w-full rounded-2xl border-2 border-border bg-primary py-3 text-[13px] font-extrabold text-primary-foreground"
          >
            Go to my map
          </button>
        </section>
      )}
    </AppFrame>
  );
}
