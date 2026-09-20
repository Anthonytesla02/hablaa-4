import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { compareTranscript } from "./text-compare";

const GradeInput = z.object({
  audio: z.string().min(1),
  expected: z.string().min(1),
  locale: z.string().min(2),
  mimeType: z.string().default("audio/webm"),
});

export const gradePronunciation = createServerFn({ method: "POST" })
  .inputValidator((data) => GradeInput.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI Gateway key not configured");

    // Decode base64 audio to binary
    const audioBytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
    const blob = new Blob([audioBytes], { type: data.mimeType });

    // Determine file extension from mime type
    const extMap: Record<string, string> = {
      "audio/webm": "webm",
      "audio/mp4": "mp4",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
    };
    const ext = extMap[data.mimeType] ?? "webm";

    // Build multipart form for Lovable AI speech-to-text
    const formData = new FormData();
    formData.append("model", "openai/gpt-4o-transcribe");
    formData.append("file", blob, `recording.${ext}`);
    formData.append("stream", "true");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Transcription failed: ${res.status} ${errText}`);
    }

    // Read SSE stream to get the final transcript
    const transcript = await readSSETranscript(res);

    // Compare transcript to expected phrase
    const { grade, overlap } = compareTranscript(transcript, data.expected);

    return {
      grade,
      transcript,
      overlap: Math.round(overlap * 100),
    };
  });

/** Read the SSE stream and accumulate transcript deltas. */
async function readSSETranscript(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;

      try {
        const event = JSON.parse(jsonStr);
        if (event.type === "transcript.text.delta" && event.delta) {
          fullText += event.delta;
        } else if (event.type === "transcript.text.done" && event.text) {
          fullText = event.text;
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  return fullText.trim();
}
