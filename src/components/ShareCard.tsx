import { useState } from "react";
import { Share2, Copy, Check, Users } from "lucide-react";
import { toast } from "sonner";
import { sfx } from "@/lib/sfx";
import { createPost } from "@/lib/feed";
import { useApp } from "@/lib/store";

export type BattleStats = {
  title: string;
  flag: string;
  /** Seconds survived. */
  seconds: number;
  accuracy: number;
  crimes: number;
  xp: number;
  tutor: string;
};

const VERDICTS = [
  { min: 0.9, line: "Barely broke a sweat.", tag: "CERTIFIED SMOOTH" },
  { min: 0.7, line: "Took a couple of hits, stayed standing.", tag: "SURVIVED" },
  { min: 0.4, line: "That was rough out there.", tag: "GOT COOKED" },
  { min: 0, line: "Absolutely cooked. Come back tomorrow.", tag: "WELL DONE 💀" },
];

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function shareText(st: BattleStats) {
  const v = VERDICTS.find((x) => st.accuracy >= x.min)!;
  return [
    `${st.flag} ${st.title}`,
    `⏱ ${mmss(st.seconds)} survived`,
    `🔥 ${Math.round(st.accuracy * 100)}% accuracy`,
    `💀 ${st.crimes} grammar crime${st.crimes === 1 ? "" : "s"}`,
    `🏆 ${v.tag}`,
    "",
    `I went up against ${st.tutor} and ${st.accuracy >= 0.7 ? "held my own" : "got absolutely cooked"}.`,
  ].join("\n");
}

/** End-of-run stat card the learner can brag with. */
export function ShareCard({ stats }: { stats: BattleStats }) {
  const [copied, setCopied] = useState(false);
  const [posted, setPosted] = useState(false);
  const [posting, setPosting] = useState(false);
  const callsign = useApp((s) => s.profile?.callsign ?? "Learner");
  const v = VERDICTS.find((x) => stats.accuracy >= x.min)!;
  const text = shareText(stats);

  async function post() {
    sfx("tap");
    setPosting(true);
    try {
      await createPost({
        kind: "simulation",
        callsign,
        body: `${v.tag} — up against ${stats.tutor}.`,
        stats: {
          flag: stats.flag,
          title: stats.title,
          seconds: Math.round(stats.seconds),
          accuracy: stats.accuracy,
          crimes: stats.crimes,
          xp: stats.xp,
          tutor: stats.tutor,
        },
      });
      setPosted(true);
      sfx("complete");
      toast.success("Posted to the community feed");
    } catch {
      toast.error("Could not post right now");
    } finally {
      setPosting(false);
    }
  }


  async function share() {
    sfx("tap");
    const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
    try {
      if (nav.share) {
        await nav.share({ text });
        return;
      }
    } catch {
      /* user cancelled — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="rounded-sm border border-primary/50 bg-card p-4">
      <p className="hud text-[9px] text-primary">{v.tag}</p>
      <p className="hud mt-1 text-[12px]">
        {stats.flag} {stats.title.toUpperCase()}
      </p>
      <dl className="hud mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-sm border border-border px-2 py-2">
          <dt className="text-[8px] text-muted-foreground">SURVIVED</dt>
          <dd className="mt-0.5">⏱ {mmss(stats.seconds)}</dd>
        </div>
        <div className="rounded-sm border border-border px-2 py-2">
          <dt className="text-[8px] text-muted-foreground">ACCURACY</dt>
          <dd className="mt-0.5">🔥 {Math.round(stats.accuracy * 100)}%</dd>
        </div>
        <div className="rounded-sm border border-border px-2 py-2">
          <dt className="text-[8px] text-muted-foreground">GRAMMAR CRIMES</dt>
          <dd className="mt-0.5">💀 {stats.crimes}</dd>
        </div>
        <div className="rounded-sm border border-border px-2 py-2">
          <dt className="text-[8px] text-muted-foreground">XP BANKED</dt>
          <dd className="mt-0.5">🏆 {stats.xp}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] text-muted-foreground">{v.line}</p>
      <button
        onClick={() => void share()}
        className="hud mt-3 flex w-full items-center justify-center gap-1.5 rounded-sm border border-primary bg-primary/10 py-2.5 text-[10px] text-primary"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" /> COPIED
          </>
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5" /> SHARE MY RESULT
          </>
        )}
      </button>
      <button
        onClick={() => void post()}
        disabled={posting || posted}
        className="hud mt-2 flex w-full items-center justify-center gap-1.5 rounded-sm border border-secondary bg-secondary/10 py-2.5 text-[10px] text-secondary disabled:opacity-60"
      >
        <Users className="h-3.5 w-3.5" />{" "}
        {posted ? "POSTED TO THE FEED" : posting ? "POSTING…" : "POST TO COMMUNITY FEED"}
      </button>
      {!copied && (
        <p className="hud mt-1.5 flex items-center justify-center gap-1 text-[8px] text-muted-foreground">
          <Copy className="h-2.5 w-2.5" /> COPIES TO YOUR CLIPBOARD IF SHARING ISN’T AVAILABLE
        </p>
      )}
    </div>
  );
}
