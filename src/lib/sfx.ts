/**
 * Procedural UI sound effects (Web Audio). No assets, no network — every sound
 * is synthesised so clicks, transitions, loading loops and completions stay
 * instant and tiny. Tuned to be soft, round and friendly (marimba/bell-ish)
 * rather than harsh beeps. Respects a persisted mute flag.
 */

export type SfxName =
  | "click"
  | "tap"
  | "transition"
  | "correct"
  | "wrong"
  | "complete"
  | "levelup"
  | "record"
  | "stop";

const MUTE_KEY = "ol.sfx.muted";

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let verb: ConvolverNode | null = null;
let muted = false;
let loadingStop: (() => void) | null = null;

if (typeof window !== "undefined") {
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    /* noop */
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    bus = ctx.createGain();
    bus.gain.value = 0.55;
    bus.connect(ctx.destination);

    // Tiny room so notes bloom instead of clicking off.
    const len = Math.floor(ctx.sampleRate * 0.7);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2;
    }
    verb = ctx.createConvolver();
    verb.buffer = buf;
    const wet = ctx.createGain();
    wet.gain.value = 0.18;
    verb.connect(wet).connect(bus);
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

export function sfxMuted() {
  return muted;
}

export function setSfxMuted(next: boolean) {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    /* noop */
  }
  if (next) stopLoading();
}

type ToneOpts = {
  freq: number;
  to?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  /** Adds a soft octave-up shimmer, marimba style. */
  shimmer?: boolean;
};

/** Soft, rounded note: sine core, gentle attack, exponential tail, light room. */
function note({
  freq,
  to,
  dur = 0.24,
  type = "sine",
  gain = 0.18,
  delay = 0,
  shimmer = true,
}: ToneOpts) {
  const c = audio();
  if (!c || !bus) return;
  const t = c.currentTime + delay;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(Math.max(900, freq * 5), t);

  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
  osc.connect(lp).connect(g);

  if (shimmer) {
    const o2 = c.createOscillator();
    o2.type = "triangle";
    o2.frequency.setValueAtTime(freq * 2, t);
    const g2 = c.createGain();
    g2.gain.value = 0.22;
    o2.connect(g2).connect(lp);
    o2.start(t);
    o2.stop(t + dur + 0.02);
  }

  g.connect(bus);
  if (verb) g.connect(verb);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur = 0.16, gain = 0.08, freq = 1800) {
  const c = audio();
  if (!c || !bus) return;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(bus);
  src.start();
}

/** Play a one-shot UI sound. Safe to call from anywhere, including SSR. */
export function sfx(name: SfxName) {
  if (muted || typeof window === "undefined") return;
  switch (name) {
    // Soft rounded "bloop" — pleasant even when tapped fast.
    case "click":
      note({ freq: 587.33, dur: 0.11, gain: 0.1, shimmer: false });
      break;
    case "tap":
      note({ freq: 783.99, dur: 0.1, gain: 0.09, shimmer: false });
      break;
    case "transition":
      note({ freq: 523.25, dur: 0.18, gain: 0.09, shimmer: false });
      note({ freq: 783.99, dur: 0.24, gain: 0.08, delay: 0.07 });
      break;
    // Happy rising third.
    case "correct":
      note({ freq: 659.25, dur: 0.16, gain: 0.14 });
      note({ freq: 987.77, dur: 0.28, gain: 0.12, delay: 0.08 });
      break;
    // Gentle "aww", never harsh.
    case "wrong":
      note({ freq: 329.63, dur: 0.18, gain: 0.11, type: "triangle", shimmer: false });
      note({ freq: 261.63, dur: 0.3, gain: 0.1, type: "triangle", delay: 0.1, shimmer: false });
      break;
    // Bright major arpeggio + sparkle.
    case "complete":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        note({ freq: f, dur: 0.5, gain: 0.14, delay: i * 0.085 }),
      );
      note({ freq: 1567.98, dur: 0.7, gain: 0.07, delay: 0.36 });
      noise(0.4, 0.03, 5200);
      break;
    case "levelup":
      [392, 523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
        note({ freq: f, dur: 0.55, gain: 0.13, delay: i * 0.075 }),
      );
      note({ freq: 2093, dur: 0.9, gain: 0.06, delay: 0.5 });
      noise(0.5, 0.03, 6000);
      break;
    case "record":
      note({ freq: 523.25, dur: 0.12, gain: 0.11, shimmer: false });
      note({ freq: 880, dur: 0.16, gain: 0.1, delay: 0.08, shimmer: false });
      break;
    case "stop":
      note({ freq: 880, dur: 0.12, gain: 0.1, shimmer: false });
      note({ freq: 523.25, dur: 0.18, gain: 0.09, delay: 0.08, shimmer: false });
      break;
  }
}

/** Soft repeating pulse while something is loading. Returns a stop function. */
export function startLoading(): () => void {
  stopLoading();
  if (muted || typeof window === "undefined") return () => {};
  let up = true;
  const iv = setInterval(() => {
    note({ freq: up ? 659.25 : 587.33, dur: 0.16, gain: 0.045, shimmer: false });
    up = !up;
  }, 640);
  loadingStop = () => clearInterval(iv);
  return stopLoading;
}

export function stopLoading() {
  if (loadingStop) {
    loadingStop();
    loadingStop = null;
  }
}

let wired = false;

/** Global click/tap feedback for buttons and links. Idempotent. */
export function initSfx() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener(
    "pointerdown",
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest(
        "button, a, [role='button'], input[type='checkbox'], label",
      );
      if (!el) return;
      sfx(el.tagName === "A" ? "tap" : "click");
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate(8);
        } catch {
          /* noop */
        }
      }
    },
    { capture: true },
  );
}
