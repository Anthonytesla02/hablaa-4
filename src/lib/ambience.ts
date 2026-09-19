/**
 * Ambient soundscapes. Recorded loops where available (café), otherwise a
 * procedural Web Audio bed plus randomised events (clinks, chimes, rumble).
 */
import cafeAmbience from "@/assets/cafe-ambience.mp3.asset.json";


export type AmbienceId =
  | "cafe"
  | "restaurant"
  | "party"
  | "station"
  | "airport"
  | "market"
  | "taxi"
  | "hotel"
  | "pharmacy";

type EventKind = "clink" | "chatter" | "chime" | "rumble" | "beat" | "whoosh";

type Config = {
  bedGain: number;
  bedFreq: number;
  bedQ: number;
  events: { kind: EventKind; everyMs: [number, number]; gain: number }[];
};

const CONFIGS: Record<AmbienceId, Config> = {
  cafe: {
    bedGain: 0.05,
    bedFreq: 480,
    bedQ: 0.7,
    events: [
      { kind: "chatter", everyMs: [1400, 3200], gain: 0.055 },
      { kind: "clink", everyMs: [2600, 7000], gain: 0.05 },
      { kind: "whoosh", everyMs: [9000, 18000], gain: 0.05 },
    ],
  },
  restaurant: {
    bedGain: 0.045,
    bedFreq: 420,
    bedQ: 0.8,
    events: [
      { kind: "chatter", everyMs: [1200, 2600], gain: 0.05 },
      { kind: "clink", everyMs: [1800, 4200], gain: 0.06 },
    ],
  },
  party: {
    bedGain: 0.05,
    bedFreq: 700,
    bedQ: 0.6,
    events: [
      { kind: "beat", everyMs: [520, 560], gain: 0.09 },
      { kind: "chatter", everyMs: [900, 2000], gain: 0.07 },
    ],
  },
  station: {
    bedGain: 0.07,
    bedFreq: 240,
    bedQ: 0.5,
    events: [
      { kind: "rumble", everyMs: [11000, 21000], gain: 0.09 },
      { kind: "chime", everyMs: [14000, 26000], gain: 0.05 },
      { kind: "chatter", everyMs: [2200, 4800], gain: 0.045 },
    ],
  },
  airport: {
    bedGain: 0.06,
    bedFreq: 300,
    bedQ: 0.5,
    events: [
      { kind: "chime", everyMs: [9000, 17000], gain: 0.055 },
      { kind: "chatter", everyMs: [2000, 4500], gain: 0.04 },
      { kind: "rumble", everyMs: [15000, 28000], gain: 0.06 },
    ],
  },
  market: {
    bedGain: 0.055,
    bedFreq: 560,
    bedQ: 0.7,
    events: [
      { kind: "chatter", everyMs: [700, 1800], gain: 0.07 },
      { kind: "clink", everyMs: [3500, 9000], gain: 0.04 },
    ],
  },
  taxi: {
    bedGain: 0.08,
    bedFreq: 150,
    bedQ: 0.4,
    events: [
      { kind: "rumble", everyMs: [4000, 9000], gain: 0.07 },
      { kind: "whoosh", everyMs: [3000, 7000], gain: 0.05 },
    ],
  },
  pharmacy: {
    bedGain: 0.025,
    bedFreq: 380,
    bedQ: 0.6,
    events: [
      { kind: "chime", everyMs: [12000, 24000], gain: 0.04 },
      { kind: "chatter", everyMs: [5000, 11000], gain: 0.03 },
      { kind: "clink", everyMs: [6000, 14000], gain: 0.03 },
    ],
  },
  hotel: {
    bedGain: 0.03,
    bedFreq: 320,
    bedQ: 0.6,
    events: [
      { kind: "chatter", everyMs: [4000, 9000], gain: 0.03 },
      { kind: "chime", everyMs: [18000, 34000], gain: 0.035 },
    ],
  },
};

export const AMBIENCE_LABELS: Record<AmbienceId, string> = {
  cafe: "Café murmur, cups, steam wand",
  restaurant: "Cutlery, close tables, dining room",
  party: "Muffled beat, crowded room",
  station: "Platform rumble, announcement chimes",
  airport: "Terminal hum, boarding chimes",
  market: "Open-air stalls, bustling voices",
  taxi: "Engine, road noise, passing cars",
  hotel: "Quiet lobby, occasional bell",
  pharmacy: "Quiet counter, door chime, blister packs",
};

function noiseBuffer(ctx: AudioContext, seconds = 3) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    d[i] = last * 3.2;
  }
  return buf;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Real recorded loops (preferred over the procedural bed when present). */
const SAMPLES: Partial<Record<AmbienceId, { url: string; level: number }>> = {
  cafe: { url: cafeAmbience.url, level: 0.45 },
};

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bed: AudioBufferSourceNode | null = null;
  private noise: AudioBuffer | null = null;
  private el: HTMLAudioElement | null = null;
  private elLevel = 1;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private volume = 0.7;

  get running() {
    return this.ctx !== null || this.el !== null;
  }

  async start(id: AmbienceId) {
    this.stop();

    const sample = SAMPLES[id];
    if (sample && typeof window !== "undefined") {
      const el = new Audio(sample.url);
      el.loop = true;
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      this.el = el;
      this.elLevel = sample.level;
      el.volume = Math.min(1, this.volume * sample.level);
      await el.play().catch(() => {});
      return;
    }

    const Ctor =
      typeof window === "undefined"
        ? undefined
        : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const cfg = CONFIGS[id];
    const ctx = new Ctor();
    await ctx.resume().catch(() => {});
    this.ctx = ctx;
    this.noise = noiseBuffer(ctx);


    const master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);
    this.master = master;

    // Noise bed
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = cfg.bedFreq;
    filter.Q.value = cfg.bedQ;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(cfg.bedGain, ctx.currentTime + 1.5);
    src.connect(filter).connect(g).connect(master);
    src.start();
    this.bed = src;

    for (const ev of cfg.events) this.schedule(ev.kind, ev.everyMs, ev.gain);
  }

  private schedule(kind: EventKind, everyMs: [number, number], gain: number) {
    const tick = () => {
      if (!this.ctx || !this.master) return;
      try {
        this.fire(kind, gain);
      } catch {
        /* noop */
      }
      this.timers.push(setTimeout(tick, rand(everyMs[0], everyMs[1])));
    };
    this.timers.push(setTimeout(tick, rand(300, everyMs[1])));
  }

  private fire(kind: EventKind, gain: number) {
    const ctx = this.ctx!;
    const out = this.master!;
    const now = ctx.currentTime;

    if (kind === "clink") {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = rand(1500, 3200);
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.22);
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + 0.25);
      return;
    }

    if (kind === "chime") {
      const freqs = [880, 1174, 1568];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        const g = ctx.createGain();
        const t = now + i * 0.28;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0005, t + 0.9);
        osc.connect(g).connect(out);
        osc.start(t);
        osc.stop(t + 1);
      });
      return;
    }

    if (kind === "beat") {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.28);
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + 0.3);
      return;
    }

    // Noise-based events: chatter swell, engine rumble, passing whoosh
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    let dur = 1.2;

    if (kind === "chatter") {
      filter.type = "bandpass";
      filter.frequency.value = rand(500, 1400);
      filter.Q.value = rand(1.5, 4);
      dur = rand(0.9, 2.2);
    } else if (kind === "rumble") {
      filter.type = "lowpass";
      filter.frequency.value = rand(90, 180);
      dur = rand(2.5, 5);
    } else {
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.linearRampToValueAtTime(1800, now + 1.2);
      filter.Q.value = 1.2;
      dur = 1.6;
    }

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, now + dur);
    src.connect(filter).connect(g).connect(out);
    src.start(now, rand(0, 2));
    src.stop(now + dur + 0.05);
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.el) this.el.volume = Math.min(1, v * this.elLevel);
    if (this.master && this.ctx) this.master.gain.value = v;
  }

  /** Duck the bed while the character speaks, so speech stays intelligible. */
  duck(on: boolean) {
    if (this.el) this.el.volume = Math.min(1, this.volume * this.elLevel * (on ? 0.35 : 1));
    if (!this.master || !this.ctx) return;
    const target = on ? this.volume * 0.35 : this.volume;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.25);
  }

  stop() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.el) {
      try {
        this.el.pause();
        this.el.src = "";
      } catch {
        /* noop */
      }
      this.el = null;
    }
    try {
      this.bed?.stop();
    } catch {
      /* noop */
    }
    this.bed = null;
    this.master = null;
    const ctx = this.ctx;
    this.ctx = null;
    void ctx?.close().catch(() => {});

  }
}
