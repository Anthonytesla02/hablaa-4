import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GlossInput = z.object({
  word: z.string().min(1).max(60),
  phrase: z.string().max(300).default(""),
  language: z.string().min(2).max(40),
});

export type WordGloss = {
  word: string;
  lemma: string;
  translation: string;
  part_of_speech: string;
  grammar: string;
  example_target: string;
  example_translation: string;
};

const FALLBACK = (word: string): WordGloss => ({
  word,
  lemma: word,
  translation: "—",
  part_of_speech: "",
  grammar: "Explanation unavailable right now. Try again in a moment.",
  example_target: "",
  example_translation: "",
});

/** Look up a single word in context: translation + short grammar note. */
export const explainWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => GlossInput.parse(data))
  .handler(async ({ data, context }): Promise<WordGloss> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return FALLBACK(data.word);

    // Word look-ups are identical for every learner, so they are answered from
    // the shared cache and only ever generated once.
    const { cachedJson, hashKey, withinQuota } = await import("./shared-cache.server");
    const cacheKey = await hashKey(
      "gloss-v1",
      data.language.toLowerCase(),
      data.word.toLowerCase(),
      data.phrase.toLowerCase(),
    );

    const system = `You are a concise ${data.language} tutor for absolute beginners.
Explain ONE word as it is used in the given sentence.
Reply with ONLY JSON matching:
{"word":string,"lemma":string,"translation":string,"part_of_speech":string,"grammar":string,"example_target":string,"example_translation":string}
Rules: "translation" = short English meaning in this context (max 6 words).
"lemma" = dictionary form. "part_of_speech" e.g. "noun (fem.)", "verb — present, 1st person".
"grammar" = ONE or TWO short sentences a beginner understands (gender, conjugation, agreement, register, or usage note).
"example_target" = a new short natural sentence in ${data.language} using the word; "example_translation" = its English translation.`;

    const produce = async (): Promise<WordGloss | null> => {
    if (!(await withinQuota(context.userId, "gloss"))) return null;
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: `Word: "${data.word}"\nSentence: "${data.phrase || data.word}"\nReturn the json.`,
            },
          ],
        }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = json.choices?.[0]?.message?.content ?? "";
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) return null;
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<WordGloss>;
      return { ...FALLBACK(data.word), ...parsed, word: data.word };
    } catch {
      return null;
    }
    };

    return (await cachedJson<WordGloss>("gloss", cacheKey, produce)) ?? FALLBACK(data.word);
  });
