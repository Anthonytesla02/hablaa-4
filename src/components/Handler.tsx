import { useEffect, useState, useSyncExternalStore } from "react";
import { X, VolumeX, Volume2, Music, Music2 } from "lucide-react";
import fallbackAvatar from "@/assets/handler-avatar.png";
import { useCompanion } from "@/lib/use-companion";
import { useHandler, type Mood } from "@/lib/handler-bus";
import { getSpeakingState, subscribeSpeaking } from "@/lib/speech";
import { setSfxMuted, sfxMuted } from "@/lib/sfx";

const MOOD_RING: Record<Mood, string> = {
  hype: "border-primary ring-2 ring-primary/40",
  proud: "border-primary",
  nudge: "border-secondary",
  tough: "border-destructive",
  idle: "border-border",
};

const MOOD_TEXT: Record<Mood, string> = {
  hype: "text-primary",
  proud: "text-primary",
  nudge: "text-secondary",
  tough: "text-destructive",
  idle: "text-foreground",
};

const EMPTY = { speaking: false, text: "", locale: "" };

/** Live speech state so the avatar can mouth along with the system voice. */
export function useSpeaking() {
  return useSyncExternalStore(subscribeSpeaking, getSpeakingState, () => EMPTY);
}

/** Animated waveform shown while the handler is reading something out. */
function Waveform() {
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="wave-bar block h-3 w-[2px] rounded-full bg-primary"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </span>
  );
}

/** Floating handler avatar: pops in with reactions, gestures while speaking. */
export function HandlerAvatar({ offset = true }: { offset?: boolean }) {
  const msg = useHandler((s) => s.msg);
  const muted = useHandler((s) => s.muted);
  const dismiss = useHandler((s) => s.dismiss);
  const toggleMute = useHandler((s) => s.toggleMute);
  const [open, setOpen] = useState(false);
  const [soundOff, setSoundOff] = useState(false);
  const { speaking, text: spokenText } = useSpeaking();
  const { character, ready } = useCompanion();
  const avatar = ready && character ? character.avatar : fallbackAvatar;
  const tutorName = ready && character ? character.name : "Your tutor";

  useEffect(() => setSoundOff(sfxMuted()), []);

  useEffect(() => {
    if (!msg) {
      setOpen(false);
      return;
    }
    setOpen(true);
    const t = setTimeout(() => dismiss(), 6500);
    return () => clearTimeout(t);
  }, [msg, dismiss]);

  const mood: Mood = msg?.mood ?? "idle";

  return (
    <div
      className={`pointer-events-none fixed right-3 z-30 flex max-w-[min(20rem,calc(100vw-1.5rem))] flex-col items-end gap-2 ${
        offset ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))]" : "bottom-4"
      }`}
    >
      {speaking && spokenText && (
        <div className="handler-pop pointer-events-none flex max-w-full items-center gap-2 rounded-sm border border-primary/60 bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
          <Waveform />
          <p className="line-clamp-2 text-[12px] leading-snug text-primary">{spokenText}</p>
        </div>
      )}

      {open && msg && !speaking && (
        <div
          key={msg.id}
          className="handler-pop pointer-events-auto relative rounded-sm border border-border bg-card/95 px-3 py-2.5 pr-8 shadow-lg backdrop-blur"
        >
          <p className="hud text-[8px] text-muted-foreground">{tutorName.toUpperCase()}</p>
          <p className={`mt-1 text-[12px] leading-snug ${MOOD_TEXT[mood]}`}>{msg.text}</p>
          <button
            onClick={dismiss}
            aria-label="Dismiss message"
            className="absolute right-1.5 top-1.5 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="pointer-events-auto flex items-center gap-1.5">
        <button
          onClick={() => {
            const next = !soundOff;
            setSoundOff(next);
            setSfxMuted(next);
          }}
          aria-label={soundOff ? "Enable interface sounds" : "Mute interface sounds"}
          className="rounded-full border border-border bg-card/90 p-1.5 text-muted-foreground backdrop-blur"
        >
          {soundOff ? <Music2 className="h-3.5 w-3.5" /> : <Music className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute tutor" : "Mute tutor"}
          className="rounded-full border border-border bg-card/90 p-1.5 text-muted-foreground backdrop-blur"
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() =>
            msg
              ? dismiss()
              : useHandler
                  .getState()
                  .push("I'm here whenever you're ready — tap a lesson and let's talk.", "idle")
          }
          aria-label={tutorName}
          className={`grid h-12 w-12 place-items-center overflow-hidden rounded-full border-2 bg-card/90 backdrop-blur ${
            speaking ? "handler-ring border-primary" : MOOD_RING[mood]
          }`}
        >
          <img
            src={avatar}
            alt={tutorName}
            width={512}
            height={512}
            loading="lazy"
            className={`h-11 w-11 rounded-full object-cover ${speaking ? "handler-talk" : "handler-idle"}`}
          />
        </button>
      </div>
    </div>
  );
}
