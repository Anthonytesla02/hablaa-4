import { Keyboard, Loader2, Mic, Square, Volume2 } from "lucide-react";
import { useSpeaker } from "@/components/Audio";
import type { VoiceAnswerState } from "@/lib/voice/use-voice-answer";
import type { WordMark } from "@/lib/voice/score";

const VERDICT = {
  great: { label: "NATIVE-LIKE", tone: "text-primary", border: "border-primary/50 bg-primary/10" },
  close: { label: "CLOSE", tone: "text-secondary", border: "border-secondary/50 bg-secondary/10" },
  retry: {
    label: "TRY AGAIN",
    tone: "text-destructive",
    border: "border-destructive/50 bg-destructive/10",
  },
} as const;

const WORD_TONE: Record<WordMark["state"], string> = {
  hit: "text-primary",
  near: "text-secondary",
  off: "text-destructive",
  missed: "text-destructive/60 line-through",
};

/** Loudness ring + mic button. */
export function TalkButton({
  voice,
  label = "TAP TO SPEAK",
  compact = false,
  tour,
}: {
  voice: VoiceAnswerState;
  label?: string | undefined;
  compact?: boolean | undefined;
  tour?: string | undefined;
}) {
  const { phase, level, toggle } = voice;
  const listening = phase === "listening";
  const busy = phase === "checking";
  const size = compact ? 56 : 76;
  const ring = 1 + Math.min(0.35, level * 0.5);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {listening && (
          <span
            className="absolute rounded-full bg-secondary/25 transition-transform duration-75"
            style={{ width: size, height: size, transform: `scale(${ring})` }}
          />
        )}
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          data-tour={tour}
          aria-label={listening ? "Stop recording" : "Start recording"}
          className={`relative flex items-center justify-center rounded-full border-2 transition-colors disabled:opacity-60 ${
            listening
              ? "border-destructive bg-destructive/15 text-destructive"
              : "border-secondary/60 bg-card text-secondary"
          }`}
          style={{ width: size - 12, height: size - 12 }}
        >
          {busy ? (
            <Loader2 className={compact ? "h-4 w-4 animate-spin" : "h-6 w-6 animate-spin"} />
          ) : listening ? (
            <Square className={compact ? "h-4 w-4" : "h-5 w-5"} />
          ) : (
            <Mic className={compact ? "h-4 w-4" : "h-6 w-6"} />
          )}
        </button>
      </div>
      <p className="hud text-center text-[10px] text-muted-foreground">
        {busy ? "CHECKING…" : listening ? "LISTENING — TAP TO STOP" : label}
      </p>
    </div>
  );
}

/** Word-by-word result read-out. */
export function VoiceResult({
  voice,
  expected,
  locale,
}: {
  voice: VoiceAnswerState;
  expected: string;
  locale: string;
}) {
  const say = useSpeaker(locale);
  const { result, transcript, error, phase } = voice;

  if (phase === "error" && error) {
    return <p className="hud text-center text-[10px] text-destructive">{error}</p>;
  }
  if (!result) return null;
  const v = VERDICT[result.verdict];

  return (
    <div className={`rounded-sm border p-3 ${v.border}`}>
      <p className={`hud text-[10px] ${v.tone}`}>
        ◆ {v.label} · {result.score}%
      </p>
      <p className="mt-2 text-base leading-snug">
        {result.words.map((w, i) => (
          <span key={`${w.word}-${i}`} className={`${WORD_TONE[w.state]} mr-1.5`}>
            {w.word}
          </span>
        ))}
      </p>
      {transcript && (
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          HEARD: <span className="text-foreground">{transcript}</span>
        </p>
      )}
      <button
        type="button"
        onClick={() => void say(expected)}
        className="hud mt-2 flex items-center gap-1 text-[10px] text-muted-foreground"
      >
        <Volume2 className="h-3 w-3" /> HEAR IT AGAIN
      </button>
    </div>
  );
}

/** Full panel: talk button, result, and a typed fallback. */
export function VoiceAnswer({
  voice,
  expected,
  locale,
  label,
  onType,
  tour,
}: {
  voice: VoiceAnswerState;
  expected: string;
  locale: string;
  label?: string | undefined;
  onType?: (() => void) | undefined;
  tour?: string | undefined;
}) {
  return (
    <div className="space-y-3 rounded-sm border border-secondary/40 bg-secondary/5 p-3">
      {voice.supported ? (
        <TalkButton voice={voice} label={label} tour={tour} />
      ) : (
        <p className="hud text-center text-[10px] text-muted-foreground">
          THIS BROWSER CAN'T RECORD — TYPE YOUR ANSWER
        </p>
      )}
      <VoiceResult voice={voice} expected={expected} locale={locale} />
      {onType && (
        <button
          type="button"
          onClick={onType}
          className="hud w-full rounded-sm border border-border py-2 text-[10px] text-muted-foreground"
        >
          <Keyboard className="mr-1 inline h-3 w-3" /> TYPE INSTEAD
        </button>
      )}
    </div>
  );
}
