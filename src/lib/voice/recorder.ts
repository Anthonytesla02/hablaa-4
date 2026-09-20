/**
 * Microphone capture with live loudness, silence auto-stop and a hard cap.
 * Browser-only; every entry point is feature-detected.
 */

export type Capture = { base64: string; mimeType: string; ms: number; peak: number };

export type MicFailure =
  | "unsupported"
  | "blocked"
  | "no-device"
  | "busy"
  | "empty"
  | "unknown";

export const MIC_MESSAGE: Record<MicFailure, string> = {
  unsupported: "This browser can't record audio — try Chrome or Safari.",
  blocked: "Microphone blocked. Allow mic access for this site, then tap again.",
  "no-device": "No microphone found on this device.",
  busy: "Another app is using the microphone. Close it and try again.",
  empty: "I didn't hear anything — get closer and speak up.",
  unknown: "Microphone unavailable — check your browser permissions.",
};

export class MicError extends Error {
  constructor(public reason: MicFailure) {
    super(MIC_MESSAGE[reason]);
  }
}

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

export const MAX_MS = 15_000;
const SILENCE_MS = 1600;
const MIN_MS = 500;
const SILENCE_LEVEL = 0.055;

export function micSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export type Session = {
  /** Resolves when recording ends (by silence, cap, or a stop() call). */
  done: Promise<Capture>;
  stop: () => void;
  cancel: () => void;
};

/**
 * Start listening. `onLevel` fires ~20x/second with a 0–1 loudness value so the
 * UI can show the learner they are being heard.
 */
export async function listen(onLevel?: (level: number) => void): Promise<Session> {
  if (!micSupported()) throw new MicError("unsupported");

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (e) {
    throw new MicError(mapError(e));
  }

  const mimeType = MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  const startedAt = Date.now();
  let peak = 0;

  // Loudness meter + silence detection.
  let audioCtx: AudioContext | null = null;
  let raf = 0;
  let lastLoud = Date.now();
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      const level = Math.min(1, Math.sqrt(sum / buf.length) * 4);
      if (level > peak) peak = level;
      if (level > SILENCE_LEVEL) lastLoud = Date.now();
      onLevel?.(level);
      const elapsed = Date.now() - startedAt;
      if (elapsed > MAX_MS) return finish();
      if (peak > SILENCE_LEVEL && elapsed > MIN_MS && Date.now() - lastLoud > SILENCE_MS) {
        return finish();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  } catch {
    // No analyser: fall back to the hard cap only.
    setTimeout(() => finish(), MAX_MS);
  }

  let settle: ((c: Capture) => void) | null = null;
  let fail: ((e: unknown) => void) | null = null;
  const done = new Promise<Capture>((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });

  let closed = false;
  function teardown() {
    cancelAnimationFrame(raf);
    void audioCtx?.close().catch(() => {});
    stream.getTracks().forEach((t) => t.stop());
  }

  function finish() {
    if (closed) return;
    closed = true;
    if (recorder.state !== "inactive") recorder.stop();
  }

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.onerror = () => {
    closed = true;
    teardown();
    fail?.(new MicError("unknown"));
  };
  recorder.onstop = async () => {
    teardown();
    const type = (recorder.mimeType || mimeType || "audio/webm").split(";")[0] ?? "audio/webm";
    const blob = new Blob(chunks, { type });
    const ms = Date.now() - startedAt;
    if (blob.size < 1200 || peak < SILENCE_LEVEL) {
      fail?.(new MicError("empty"));
      return;
    }
    const base64 = await toBase64(blob);
    if (!base64) {
      fail?.(new MicError("empty"));
      return;
    }
    settle?.({ base64, mimeType: type, ms, peak });
  };

  recorder.start(250);

  return {
    done,
    stop: finish,
    cancel: () => {
      closed = true;
      try {
        if (recorder.state !== "inactive") {
          recorder.onstop = () => teardown();
          recorder.stop();
        } else teardown();
      } catch {
        teardown();
      }
      fail?.(new MicError("empty"));
    },
  };
}

function mapError(e: unknown): MicFailure {
  const name = (e as { name?: string } | null)?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") return "blocked";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-device";
  if (name === "NotReadableError") return "busy";
  return "unknown";
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const out = String(reader.result ?? "");
      resolve(out.includes(",") ? (out.split(",")[1] ?? "") : "");
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
}
