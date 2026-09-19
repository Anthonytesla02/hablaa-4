import { createFileRoute } from "@tanstack/react-router";

/** Neural text-to-speech so tutors always get the right voice, not whatever the device has. */
export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as
          | { text?: string; voice?: string; speed?: number; instructions?: string }
          | null;
        const text = (body?.text ?? "").trim().slice(0, 1200);
        if (!text) return new Response("Missing text", { status: 400 });

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("TTS unavailable", { status: 503 });

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: text,
            voice: body?.voice || "ash",
            speed: Math.min(1.4, Math.max(0.7, body?.speed ?? 1)),
            ...(body?.instructions ? { instructions: body.instructions } : {}),
            response_format: "mp3",
            stream_format: "audio",
          }),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          return new Response(detail || "TTS failed", { status: res.status });
        }

        return new Response(res.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
