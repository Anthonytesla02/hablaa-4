/** Browser TTS / STT helpers. All calls are feature-detected and safe on the server. */

export function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let voicesCache: SpeechSynthesisVoice[] = [];

/** Voices load asynchronously in Chrome/Safari; wait (briefly) for them. */
function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve([]);
    const load = () => window.speechSynthesis.getVoices();
    voicesCache = load();
    if (voicesCache.length > 0) return resolve(voicesCache);

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      voicesCache = load();
      window.speechSynthesis.onvoiceschanged = null;
      resolve(voicesCache);
    };
    window.speechSynthesis.onvoiceschanged = done;
    // Poll as a fallback: some browsers never fire onvoiceschanged.
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      if (load().length > 0 || tries > 20) {
        clearInterval(iv);
        done();
      }
    }, 100);
  });
}

/** Prefer natural/neural voices — the handler should never sound robotic. */
const QUALITY = [
  "natural",
  "neural",
  "premium",
  "enhanced",
  "google",
  "siri",
  "microsoft",
];

const MALE_VOICE_NAMES = [
  "aaron",
  "alvaro",
  "carlos",
  "daniel",
  "david",
  "diego",
  "eddy",
  "guy",
  "jorge",
  "mark",
  "pablo",
  "paul",
  "raul",
  "reed",
  "rocko",
  "thomas",
];

const FEMALE_VOICE_NAMES = [
  "ava",
  "carmen",
  "elena",
  "flo",
  "helena",
  "jenny",
  "laura",
  "maria",
  "monica",
  "paulina",
  "samantha",
  "shelley",
  "sofia",
  "susan",
];

function score(v: SpeechSynthesisVoice, preferredGender?: "male" | "female") {
  const n = v.name.toLowerCase();
  let s = 0;
  QUALITY.forEach((q, i) => {
    if (n.includes(q)) s += (QUALITY.length - i) * 10;
  });
  if (!v.localService) s += 5; // cloud voices are usually the good ones
  if (n.includes("compact") || n.includes("espeak")) s -= 30;
  if (preferredGender === "male") {
    if (MALE_VOICE_NAMES.some((name) => n.includes(name))) s += 100;
    if (FEMALE_VOICE_NAMES.some((name) => n.includes(name))) s -= 100;
  }
  if (preferredGender === "female") {
    if (FEMALE_VOICE_NAMES.some((name) => n.includes(name))) s += 100;
    if (MALE_VOICE_NAMES.some((name) => n.includes(name))) s -= 100;
  }
  return s;
}

function pickVoice(locale: string, preferredGender?: "male" | "female") {
  if (!ttsSupported()) return undefined;
  if (voicesCache.length === 0) voicesCache = window.speechSynthesis.getVoices();
  const base = locale.split("-")[0] ?? locale;
  const exact = voicesCache.filter((v) => v.lang.replace("_", "-") === locale);
  const loose = voicesCache.filter((v) => v.lang.replace("_", "-").startsWith(base));
  const pool = exact.length > 0 ? exact : loose;
  return [...pool].sort((a, b) => score(b, preferredGender) - score(a, preferredGender))[0];
}

/* ---------------------------------------------------------------- *
 * Speaking bus — lets the handler avatar animate while the system   *
 * is talking (mouth/gesture animation + live caption).              *
 * ---------------------------------------------------------------- */

type SpeakingState = { speaking: boolean; text: string; locale: string };
let speakingState: SpeakingState = { speaking: false, text: "", locale: "" };
const listeners = new Set<() => void>();

export function subscribeSpeaking(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSpeakingState() {
  return speakingState;
}

function setSpeaking(next: SpeakingState) {
  speakingState = next;
  listeners.forEach((l) => l());
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- *
 * Neural voices. Device voice lists rarely contain a real male       *
 * Spanish voice, so tutors with a gender preference are spoken by    *
 * the server TTS voice instead, with the browser engine as fallback. *
 * ---------------------------------------------------------------- */

const NEURAL_VOICE = { male: "ash", female: "shimmer" } as const;
const audioCache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;
let neuralBroken = false;
let unlocked = false;

/**
 * Mobile browsers only allow audio that starts from a user gesture. Play a
 * silent clip on the very first tap so later playback is allowed.
 */
export function unlockAudio() {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;
  try {
    const a = new Audio(
      "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA",
    );
    a.volume = 0;
    void a.play().catch(() => {});
  } catch {
    /* noop */
  }
  try {
    if (ttsSupported()) window.speechSynthesis.resume();
  } catch {
    /* noop */
  }
}

if (typeof window !== "undefined") {
  const on = () => unlockAudio();
  window.addEventListener("pointerdown", on, { once: true, capture: true });
  window.addEventListener("touchstart", on, { once: true, capture: true });
  window.addEventListener("keydown", on, { once: true, capture: true });
}

async function speakNeural(
  text: string,
  locale: string,
  rate: number,
  gender: "male" | "female",
): Promise<boolean> {
  if (neuralBroken || typeof window === "undefined") return false;
  const voice = NEURAL_VOICE[gender];
  const key = `${voice}|${rate}|${locale}|${text}`;
  try {
    let url = audioCache.get(key);
    if (!url) {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice,
          speed: rate,
          instructions:
            gender === "male"
              ? "Young man in his early twenties, relaxed and friendly, natural conversational pace."
              : "Warm, friendly young woman, natural conversational pace.",
        }),
      });
      if (!res.ok) {
        if (res.status === 503 || res.status === 404) neuralBroken = true;
        return false;
      }
      const blob = await res.blob();
      if (blob.size < 512) return false;
      url = URL.createObjectURL(blob);
      if (audioCache.size > 60) {
        const oldest = audioCache.keys().next().value;
        if (oldest) {
          URL.revokeObjectURL(audioCache.get(oldest)!);
          audioCache.delete(oldest);
        }
      }
      audioCache.set(key, url);
    }

    stopSpeaking();
    setSpeaking({ speaking: true, text, locale });
    const audio = new Audio(url);
    currentAudio = audio;
    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      audio.onended = done;
      audio.onerror = done;
      audio.play().catch(done);
    });
    currentAudio = null;
    return true;
  } catch {
    return false;
  }
}

export async function speak(
  text: string,
  locale: string,
  rate = 1,
  preferredGender?: "male" | "female",
): Promise<void> {
  if (!text) return;
  // Always try the neural voice first: device speech engines are missing or
  // silently blocked on a lot of mobile browsers.
  {
    const ok = await speakNeural(text, locale, rate, preferredGender ?? "female");
    setSpeaking({ speaking: false, text: "", locale: "" });
    if (ok) return;
  }
  if (!ttsSupported()) return;
  const synth = window.speechSynthesis;

  try {
    await voicesReady();
    setSpeaking({ speaking: true, text, locale });


    // Clear any queued/stuck utterance, then give the engine a beat.
    // Speaking immediately after cancel() is silently dropped in Chrome.
    synth.cancel();
    if (synth.paused) synth.resume();
    await wait(120);

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearInterval(watchdog);
        resolve();
      };

      const u = new SpeechSynthesisUtterance(text);
      u.lang = locale;
      u.rate = rate;
      const v = pickVoice(locale, preferredGender);
      if (v) u.voice = v;
      u.onend = finish;
      u.onerror = finish;

      let started = false;
      u.onstart = () => {
        started = true;
      };

      // Watchdog: if the engine never starts (Chrome queue bug) retry once;
      // if it stalls mid-utterance, bail out instead of hanging forever.
      let ticks = 0;
      let retried = false;
      const watchdog = setInterval(() => {
        ticks += 1;
        if (!started && !synth.speaking && !synth.pending) {
          if (!retried && ticks >= 5) {
            retried = true;
            try {
              synth.resume();
              synth.speak(u);
            } catch {
              finish();
            }
          } else if (retried && ticks >= 20) {
            finish();
          }
          return;
        }
        if (started && !synth.speaking && !synth.pending) finish();
        if (ticks > 300) finish();
      }, 100);

      try {
        synth.speak(u);
      } catch {
        finish();
      }
    });
  } catch {
    /* noop */
  } finally {
    setSpeaking({ speaking: false, text: "", locale: "" });
  }
}

export function stopSpeaking() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      /* noop */
    }
    currentAudio = null;
  }
  if (ttsSupported()) window.speechSynthesis.cancel();
  setSpeaking({ speaking: false, text: "", locale: "" });
}



type SR = any;

export function sttSupported() {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function listenOnce(
  locale: string,
  onResult: (transcript: string) => void,
  onError: (reason: string) => void,
): () => void {
  if (!sttSupported()) {
    onError("unsupported");
    return () => {};
  }
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const rec: SR = new Ctor();
  rec.lang = locale;
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  rec.continuous = false;
  let done = false;
  rec.onresult = (e: any) => {
    done = true;
    const alts: string[] = [];
    for (let i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript);
    onResult(alts.join(" | "));
  };
  rec.onerror = (e: any) => {
    done = true;
    onError(e?.error ?? "error");
  };
  rec.onend = () => {
    if (!done) onError("no-speech");
  };
  try {
    rec.start();
  } catch {
    onError("error");
  }
  return () => {
    try {
      rec.stop();
    } catch {
      /* noop */
    }
  };
}

/**
 * Continuous dictation: keeps recording until the caller stops it.
 * The Web Speech API ends the session on the first pause, so we restart it
 * automatically and accumulate the finalised transcript.
 */
export function listenContinuous(
  locale: string,
  handlers: {
    onPartial?: (text: string) => void;
    onFinal: (text: string) => void;
    onError: (reason: string) => void;
  },
): () => void {
  if (!sttSupported()) {
    handlers.onError("unsupported");
    return () => {};
  }
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  let rec: SR | null = null;
  let stopped = false;
  let finalText = "";
  let fatal = false;

  const mergeTranscript = (current: string, incoming: string) => {
    const previous = current.trim();
    const next = incoming.trim();
    if (!previous) return next;
    if (!next) return previous;

    const previousWords = previous.split(/\s+/);
    const nextWords = next.split(/\s+/);
    const comparable = (word: string) => normalize(word);
    const previousKey = previousWords.map(comparable).join(" ");
    const nextKey = nextWords.map(comparable).join(" ");

    // Recognition restarts often replay the whole phrase with extra words.
    if (nextKey.startsWith(previousKey)) return next;
    if (previousKey.startsWith(nextKey) || previousKey.endsWith(nextKey)) return previous;

    // Otherwise retain only the non-repeated tail of the new segment.
    const maxOverlap = Math.min(previousWords.length, nextWords.length);
    for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
      const tail = previousWords.slice(-overlap).map(comparable).join(" ");
      const head = nextWords.slice(0, overlap).map(comparable).join(" ");
      if (tail === head) {
        return [...previousWords, ...nextWords.slice(overlap)].join(" ");
      }
    }

    return `${previous} ${next}`;
  };

  const build = () => {
    const r: SR = new Ctor();
    r.lang = locale;
    r.continuous = true;
    // The simulation only shows text after the user stops. Interim hypotheses
    // are cumulative and were the source of repeated, expanding phrases.
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = (res[0]?.transcript ?? "").trim();
        if (!txt) continue;
        if (res.isFinal) {
          finalText = mergeTranscript(finalText, txt);
        }
      }
      handlers.onPartial?.(finalText);
    };

    r.onerror = (e: any) => {
      const err = e?.error ?? "error";
      // "no-speech" / "aborted" are recoverable — just restart the recogniser.
      if (err !== "no-speech" && err !== "aborted") {
        fatal = true;
        stopped = true;
        handlers.onError(err);
      }
    };
    r.onend = () => {
      if (stopped || fatal) {
        if (!fatal) handlers.onFinal(finalText.trim());
        return;
      }
      try {
        r.start();
      } catch {
        handlers.onFinal(finalText.trim());
      }
    };
    return r;
  };

  try {
    rec = build();
    rec.start();
  } catch {
    handlers.onError("error");
    return () => {};
  }

  return () => {
    if (stopped) return;
    stopped = true;
    try {
      rec?.stop();
    } catch {
      handlers.onFinal(finalText.trim());
    }
  };
}

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Rubric-based evaluation of a spoken/typed reply (spec 7.3): did they attempt
 * the target language, did they hit the core pattern, does it answer the prompt.
 */
export function evaluateResponse(
  transcript: string,
  expected: string[],
  corePattern: string,
): { pass: boolean; hitPattern: boolean; attempted: boolean } {
  const said = normalize(transcript);
  const attempted = said.length > 1;
  const pattern = normalize(corePattern.replace(/uses?|'/g, ""));
  const patternWords = pattern.split(" ").filter((w) => w.length > 1);
  const hitPattern =
    patternWords.length > 0 && patternWords.every((w) => said.includes(w));

  let overlap = 0;
  for (const e of expected) {
    const words = normalize(e.replace(/\[.*?\]/g, "")).split(" ").filter((w) => w.length > 2);
    if (words.length === 0) continue;
    const hits = words.filter((w) => said.includes(w)).length / words.length;
    overlap = Math.max(overlap, hits);
  }
  return { pass: attempted && (hitPattern || overlap >= 0.6), hitPattern, attempted };
}
