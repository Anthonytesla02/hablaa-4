import { create } from "zustand";

export type Mood = "hype" | "proud" | "nudge" | "tough" | "idle";

export type HandlerMsg = { id: number; text: string; mood: Mood };

type HandlerState = {
  msg: HandlerMsg | null;
  muted: boolean;
  push: (text: string, mood?: Mood) => void;
  dismiss: () => void;
  toggleMute: () => void;
};

let seq = 0;

export const useHandler = create<HandlerState>()((set, get) => ({
  msg: null,
  muted: false,
  push: (text, mood = "idle") => {
    if (get().muted) return;
    seq += 1;
    set({ msg: { id: seq, text, mood } });
  },
  dismiss: () => set({ msg: null }),
  toggleMute: () =>
    set((s) => ({ muted: !s.muted, msg: s.muted ? s.msg : null })),
}));

/** Fire a line from the handler avatar. Safe to call from anywhere. */
export function handlerSay(text: string, mood: Mood = "idle") {
  useHandler.getState().push(text, mood);
}

const LINES: Record<string, string[]> = {
  correct: [
    "Clean. That's how a native says it.",
    "Locked in. Next.",
    "Textbook. Keep the rhythm going.",
  ],
  wrong: [
    "Shake it off — misses are how the vault learns.",
    "Not quite. You'll see this one again soon.",
    "Close enough to be dangerous. Try it again later.",
  ],
  streak3: [
    "Three in a row. You're in the pocket.",
    "Momentum. Don't stop now.",
  ],
  streak5: [
    "Five straight — that's operative-grade recall.",
    "You're carrying this session.",
  ],
  recallStart: [
    "Active recall time. Say it out loud before you reveal — that's the whole trick.",
  ],
  recallDone: [
    "Vault serviced. Those intervals just stretched out nicely.",
    "Recap filed. Your future self says thanks.",
  ],
  simStart: [
    "Earpiece is in. I'll be listening — just talk, mistakes and all.",
    "Stay in character. If you stall, tap a suggested line.",
  ],
  simGood: ["Nice recovery.", "That landed naturally.", "Good — you sounded local."],
  simEnd: [
    "Scene closed. That was a real conversation, not a flashcard.",
  ],
  mapIdle: [
    "Pick the glowing checkpoint. Cleared ones can be drilled again in the Vault.",
  ],
};

export function handlerReact(kind: keyof typeof LINES, mood: Mood = "idle") {
  const pool = LINES[kind];
  if (!pool || pool.length === 0) return;
  handlerSay(pool[Math.floor(Math.random() * pool.length)]!, mood);
}
