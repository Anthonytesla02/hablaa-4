import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1).max(600),
  language: z.string().min(2).max(40),
});

export type Translation = { text: string; translation: string };

/** Translate what the learner just said (target language → English) for confirmation. */
export const translateUtterance = createServerFn({ method: "POST" })
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data }): Promise<Translation> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { text: data.text, translation: "" };

    const system = `You clean up and translate a language learner's spoken utterance.
The learner is practising ${data.language}. Reply with ONLY JSON:
{"text":string,"translation":string}
"text" = the utterance written out properly in ${data.language} (fix obvious speech-to-text spelling/accents ONLY; never fix their grammar or change their words).
If the learner spoke English, keep it as it is in "text".
"translation" = a plain English translation of what they actually said.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-3.7-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: `Utterance: "${data.text}"\nReturn the json.` },
          ],
        }),
      });
      if (!res.ok) return { text: data.text, translation: "" };
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = json.choices?.[0]?.message?.content ?? "";
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) return { text: data.text, translation: "" };
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<Translation>;
      return {
        text: (parsed.text ?? data.text).trim() || data.text,
        translation: (parsed.translation ?? "").trim(),
      };
    } catch {
      return { text: data.text, translation: "" };
    }
  });
