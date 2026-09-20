import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { speak, stopSpeaking, ttsSupported } from "@/lib/speech";
import { useApp } from "@/lib/store";

export function useSpeaker(locale: string) {
  const rate = useApp((s) => s.settings.rate);
  return useCallback(
    (text: string, override?: number) => speak(text, locale, override ?? rate),
    [locale, rate],
  );
}

export function PlayButton({
  text,
  locale,
  rate,
  label = "PLAY TRANSLESSON",
  autoPlay = false,
}: {
  text: string;
  locale: string;
  rate?: number;
  label?: string;
  autoPlay?: boolean;
}) {
  const say = useSpeaker(locale);
  const [playing, setPlaying] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const play = useCallback(async () => {
    setPlaying(true);
    await say(text, rate);
    if (alive.current) setPlaying(false);
  }, [say, text, rate]);

  // Auto-play once per text. If the browser blocks it (no user gesture yet),
  // fall back to playing on the first interaction anywhere on the page.
  const autoPlayed = useRef<string | null>(null);
  useEffect(() => {
    if (!autoPlay || !ttsSupported()) return;
    if (autoPlayed.current === text) return;
    autoPlayed.current = text;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) void play();
    }, 250);

    const onGesture = () => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) void play();
      window.removeEventListener("pointerdown", onGesture);
    };
    window.addEventListener("pointerdown", onGesture, { once: true });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("pointerdown", onGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoPlay]);

  return (
    <button
      type="button"
      onClick={play}
      className={`flex w-full items-center justify-center gap-2 rounded-sm border border-secondary/60 px-4 py-3 text-secondary transition-colors ${
        playing ? "mic-live bg-secondary/10" : "bg-secondary/5 active:bg-secondary/15"
      }`}
    >
      <Volume2 className="h-4 w-4" />
      <span className="hud text-[10px]">{playing ? "TRANSMITTING…" : label}</span>
    </button>
  );
}

