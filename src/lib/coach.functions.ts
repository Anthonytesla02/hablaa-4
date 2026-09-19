import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CompanionBrief = z.object({
  personality: z.string().max(900).default(""),
  characterName: z.string().max(60).default(""),
  characterBio: z.string().max(300).default(""),
  dialect: z.string().max(300).default(""),
  slang: z.number().int().min(0).max(3).default(1),
  roast: z.number().int().min(0).max(3).default(1),
  localMode: z.boolean().default(true),
  noTranslate: z.boolean().default(false),
  interjectOnly: z.boolean().default(false),
  memory: z.array(z.string().max(200)).max(6).default([]),
});

const CoachInput = z.object({
  language: z.string().min(2).max(40),
  setting: z.string().max(300).default(""),
  characterLine: z.string().max(600).default(""),
  userText: z.string().max(600),
  options: z.array(z.string().max(200)).max(6).default([]),
  companion: CompanionBrief.optional(),
  /** Allow a dramatic reaction on this turn (pacing is decided client-side). */
  allowRoast: z.boolean().default(false),
  /** A weakness the learner keeps repeating, for callback jokes. */
  runningJoke: z.string().max(120).default(""),
});

export type CoachVerdict = {
  correct: boolean;
  /** 0 perfect · 1 tiny · 2 worth fixing · 3 meaning changed · 4 hilarious/confusing. */
  severity: 0 | 1 | 2 | 3 | 4;
  /** One short in-character reaction line, e.g. "Yesterday I go? Where you going, bul?" */
  reaction: string;
  why: string;
  fix: string;
  better: string;
  better_translation: string;
  /** What the learner must repeat back before the scene continues. */
  retry: string;
  /** Short reusable label for the weakness, e.g. "ser vs estar". */
  tag: string;
};

const OK: CoachVerdict = {
  correct: true,
  severity: 0,
  reaction: "",
  why: "",
  fix: "",
  better: "",
  better_translation: "",
  retry: "",
  tag: "",
};

/** Checks a learner's line against the offered options before the scene advances. */
export const checkUtterance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CoachInput.parse(data))
  .handler(async ({ data, context }): Promise<CoachVerdict> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return OK;

    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N} ]/gu, "")
        .trim();

    // Exact match with an offered option is always accepted, no model call.
    if (data.options.some((o) => norm(o) === norm(data.userText))) return OK;

    // Live grading is personal to the conversation, so it cannot be shared:
    // budget it per user instead.
    const { withinQuota } = await import("./shared-cache.server");
    if (!(await withinQuota(context.userId, "coach"))) return OK;

    const c = data.companion;
    const persona = c
      ? `You are ${c.characterName || "their language partner"}${c.characterBio ? ` — ${c.characterBio}` : ""}.
Personality contract: ${c.personality}
Dialect and voice: ${c.dialect}
${c.interjectOnly ? "You stay quiet unless there is a real mistake. When there is one, you are short, sharp and human — never a lecture." : ""}
${c.localMode ? "Prefer how people really speak in your region over textbook forms when suggesting the better line." : ""}
${c.memory.length ? `You already know they repeatedly struggle with: ${c.memory.join("; ")}.` : ""}
${data.runningJoke ? `Running joke you can call back to, but only once: "${data.runningJoke}".` : ""}
${
  data.allowRoast
    ? "You MAY open with one funny, dramatic reaction to the mistake. Target the sentence, never the person. One line only."
    : "Do NOT joke this time. Straight, warm correction only."
}`
      : "";

    const system = `You are a ${data.language} language partner inside a role-play scene.
${persona}
Scene: ${data.setting}
The character just said: "${data.characterLine}"
Things the learner could have said:
${data.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}

The learner said: "${data.userText}"

Grade the mistake on this severity scale:
0 = perfect or a natural equivalent. No correction.
1 = tiny slip (accent, small article, slight awkwardness) — understandable, do NOT interrupt.
2 = an important mistake worth a quick "hold up" and a retry.
3 = the meaning changed: they said something different from what they meant.
4 = hilarious or genuinely confusing — wrong language, nonsense, or accidentally rude.

Reply with ONLY JSON:
{"correct":boolean,"severity":0|1|2|3|4,"reaction":string,"why":string,"fix":string,"better":string,"better_translation":string,"retry":string,"tag":string}
- "correct" = true for severity 0 or 1.
- "reaction" = ONE short spoken line in your own voice reacting to the mistake, max 12 words. Echo the wrong bit back as a question when it helps ("Yesterday I go?"). Empty if correct.
- "why" = ONE short English sentence on what is wrong. Empty if correct.
- "fix" = ONE short English sentence on how to fix it. Empty if correct.
- "better" = the correct line, in ${data.language} only. Empty if correct.
- "better_translation" = English for "better". Empty if correct.
- "retry" = exactly what you want them to repeat back (normally the same as "better"). Empty if correct.
- "tag" = 2-4 word lowercase label for the weakness (e.g. "ser vs estar", "past tense"). Empty if correct.
Never write more than one sentence per field. No paragraphs, ever.`;

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
            { role: "user", content: "Judge the learner's line. Return the json." },
          ],
        }),
      });
      if (!res.ok) return OK;
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = json.choices?.[0]?.message?.content ?? "";
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) return OK;
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<CoachVerdict>;
      const severity = (Math.min(4, Math.max(0, Number(parsed.severity ?? 0))) || 0) as CoachVerdict["severity"];
      return {
        ...OK,
        ...parsed,
        severity,
        retry: parsed.retry || parsed.better || "",
        correct: severity <= 1,
      };
    } catch {
      return OK;
    }
  });
