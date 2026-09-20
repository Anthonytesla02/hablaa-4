import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  /** base64-encoded audio clip */
  audio: z.string().min(1),
  mimeType: z.string().default("audio/webm"),
  /** BCP-47 locale of the language being practised, e.g. "es-ES" */
  locale: z.string().min(2).default("es-ES"),
});

const EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
};

export type TranscribeResult = { transcript: string };

/** Turn a recorded clip into text. One call, one JSON answer. */
export const transcribeSpeech = createServerFn({ method: "POST" })
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data }): Promise<TranscribeResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Speech checking isn't configured yet.");

    const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
    const base = data.mimeType.split(";")[0] ?? "audio/webm";
    const blob = new Blob([bytes], { type: base });
    const ext = EXT[base] ?? "webm";

    const form = new FormData();
    form.append("model", "google/gemini-3.5-transcribe");
    form.append("file", blob, `speech.${ext}`);
    form.append("language", (data.locale.split("-")[0] ?? "es").toLowerCase());
    form.append("response_format", "json");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Too many tries at once — wait a moment.");
      if (res.status === 402 || res.status === 403)
        throw new Error("Speech checking is unavailable right now.");
      throw new Error(`Couldn't hear that (${res.status}). ${body.slice(0, 120)}`);
    }

    const type = res.headers.get("content-type") ?? "";
    const transcript = type.includes("event-stream")
      ? await readStream(res)
      : ((await res.json().catch(() => null)) as { text?: string } | null)?.text?.trim() ?? "";

    return { transcript };
  });

/** Some models answer as a server-sent stream; accumulate the deltas. */
async function readStream(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as { type?: string; delta?: string; text?: string };
        if (event.type?.endsWith(".delta") && event.delta) text += event.delta;
        else if (event.text) text = event.text;
      } catch {
        /* ignore partial lines */
      }
    }
  }
  return text.trim();
}
