import { useRef, useState, useCallback } from "react";

/** Client-side audio recording hook using MediaRecorder. */
export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser can't record audio — try Chrome or Safari.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      // Pick the best supported mime type
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];
      const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => setError("Recording stopped unexpectedly — try again.");
      recorderRef.current = recorder;
      // Emit chunks as we go: some mobile browsers drop everything otherwise.
      recorder.start(250);
      setRecording(true);
    } catch (e) {
      const name = (e as { name?: string } | null)?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Microphone blocked. Allow mic access for this site, then tap again.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No microphone found on this device.");
      } else if (name === "NotReadableError") {
        setError("Another app is using the microphone. Close it and try again.");
      } else {
        setError("Microphone unavailable — check your browser permissions.");
      }
    }
  }, []);

  const stop = useCallback((): Promise<{ blob: Blob; base64: string; mimeType: string } | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        setRecording(false);
        resolve(null);
        return;
      }

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setRecording(false);

        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size < 256) {
          resolve(null);
          return;
        }

        // Convert to base64 for server function transport
        const base64 = await blobToBase64(blob);
        if (!base64) {
          resolve(null);
          return;
        }
        resolve({ blob, base64, mimeType: type.split(";")[0] ?? "audio/webm" });
      };

      try {
        recorder.requestData();
      } catch {
        /* noop */
      }
      recorder.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorder.stop();
    }
    setRecording(false);
  }, []);

  return { recording, error, start, stop, cancel };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve("");
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data URL prefix
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}
