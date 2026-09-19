import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Turn = z.object({
  role: z.enum(["user", "character"]),
  text: z.string().max(600),
});

const CompanionBrief = z.object({
  personality: z.string().max(900).default(""),
  interjectOnly: z.boolean().default(false),
  characterName: z.string().max(60).default(""),
  characterBio: z.string().max(300).default(""),
  dialect: z.string().max(300).default(""),
  slang: z.number().int().min(0).max(3).default(1),
  roast: z.number().int().min(0).max(3).default(1),
  localMode: z.boolean().default(true),
  noTranslate: z.boolean().default(false),
  memory: z.array(z.string().max(200)).max(6).default([]),
});

const SimInput = z.object({
  language: z.string().min(2).max(40),
  setting: z.string().min(2).max(300),
  character: z.string().min(2).max(120),
  goals: z.array(z.string().max(160)).max(8).default([]),
  minExchanges: z.number().int().min(2).max(30).default(10),
  exchanges: z.number().int().min(0).max(200).default(0),

  level: z.string().min(1).max(40).default("absolute beginner"),
  history: z.array(Turn).max(120).default([]),
  userText: z.string().max(600).default(""),
  companion: CompanionBrief.optional(),
});


export type SimReply = {
  reply: string;
  reply_translation: string;
  stage_direction: string;
  suggestions: { target: string; translation: string }[];
  feedback: { verdict: "good" | "understandable" | "unclear"; note: string } | null;
  objective: string;
  handler_note: string;
  ended: boolean;
};

const FALLBACK: SimReply = {
  reply: "…",
  reply_translation: "The line dropped. Try again.",
  stage_direction: "Connection unstable.",
  suggestions: [],
  feedback: null,
  objective: "",
  handler_note: "",
  ended: false,
};

/** One turn of an immersive role-play conversation in the target language. */
export const simulateTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => SimInput.parse(data))
  .handler(async ({ data, context }): Promise<SimReply> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return FALLBACK;

    // Role-play turns are unique per conversation; cap them per user per day.
    const { withinQuota } = await import("./shared-cache.server");
    if (!(await withinQuota(context.userId, "simulate"))) {
      return {
        ...FALLBACK,
        reply_translation: "You have reached today's practice limit. Come back tomorrow.",
        stage_direction: "Daily practice limit reached.",
      };
    }

    const c = data.companion;
    const slangWords = ["textbook-clean, no slang", "light everyday informality", "plenty of real slang", "maximum street slang, like texting a friend"];
    const roastWords = [
      "Never mock mistakes.",
      "When they slip, add one gentle wink before the correction.",
      "When they slip, joke at their expense before correcting — playful, never cruel.",
      "When they slip, roast them savagely and hilariously (\"that sentence was fighting for its life 💀\") — then ALWAYS give the correct version and why.",
    ];
    const persona = c
      ? `
YOU ARE ${c.characterName || "your character"}${c.characterBio ? ` — ${c.characterBio}` : ""}.
Dialect: ${c.dialect || "neutral"}.
Personality contract (this changes HOW you teach, not just your wording): ${c.personality}
Slang dial: ${slangWords[Math.min(3, Math.max(0, c.slang))]}.
Roast dial: ${roastWords[Math.min(3, Math.max(0, c.roast))]}
${c.localMode ? "TALK LIKE A LOCAL: always prefer how people really speak over the textbook form, and when you use a natural form that a textbook wouldn't teach, mention it in one clause." : ""}
${c.noTranslate ? 'DON\'T-TRANSLATE MODE: set "reply_translation" to "" unless the learner explicitly asks in English for a translation. If they say they do not understand, rephrase in SIMPLER target language instead of translating.' : ""}
${c.memory.length ? `You remember this learner keeps struggling with: ${c.memory.join("; ")}. Work at least one of these into the scene naturally and call it out when they get it right.` : ""}
${c.interjectOnly ? "INTERJECT-ONLY MODE: you are not in teacher mode. Keep the conversation moving and say NOTHING about grammar unless the learner made a real mistake — corrections are handled separately. Set \"feedback\" to null unless there is something genuinely worth flagging, and keep it to one short clause." : ""}
`
      : "";

    const system = `You role-play a realistic ${data.character} in this setting: ${data.setting}.
${persona}
You speak ONLY ${data.language}, naturally but simply, calibrated for a ${data.level} learner.
TALK LESS THAN THE LEARNER. Keep every line to 1-2 short sentences, under 25 words total — the
learner should be doing 60% of the talking, so never monologue and never explain at length.
Stay in character, react to what the learner actually said,
ask follow-up questions, and drive a LONG, layered interaction — not a two-line transaction.
The learner may also ask YOU questions — answer them in character, with a small human detail each time.


Scene beats to work through in order, taking several exchanges each:
${(data.goals.length ? data.goals : ["greeting and small talk", "the main business of the scene", "a complication or extra question", "recommendations or opinions", "settling up and a natural goodbye"]).map((g, i) => `${i + 1}. ${g}`).join("\n")}

So far there have been ${data.exchanges} exchanges. Do NOT wrap up before ${data.minExchanges} exchanges:
if the current beat is finished, introduce the next beat, a small complication, or a new question of your own.

Reply with ONLY JSON matching:
{"reply":string,"reply_translation":string,"stage_direction":string,
 "suggestions":[{"target":string,"translation":string}],
 "feedback":{"verdict":"good"|"understandable"|"unclear","note":string} | null,
 "objective":string,"handler_note":string,"ended":boolean}

Rules:
- "reply" = your next line, in ${data.language} only. "reply_translation" = English.
- "stage_direction" = one short English sentence of sensory scene detail (sounds, smells, what people nearby are doing). Vary it every turn.
- "suggestions" = 3 SHORT things the learner could say next in ${data.language}, each with an English translation. At least one must be a question the learner asks you, and at least one must push the scene forward.
- "feedback" = null on the opening line; otherwise a one-sentence English coaching note on the learner's last message (grammar/word choice/naturalness). Be encouraging and specific.
- "objective" = a short English line telling the learner what to accomplish in this beat (e.g. "Ask what she recommends, then order it").
- "handler_note" = one short, warm, slightly wry English aside from the learner's coach about how they are doing. One sentence.
- "ended" = true ONLY after at least ${data.minExchanges} exchanges AND a real goodbye has happened.`;


    const convo = data.history.map((t) => ({
      role: t.role === "user" ? ("user" as const) : ("assistant" as const),
      content: t.text,
    }));
    if (data.userText.trim()) convo.push({ role: "user" as const, content: data.userText.trim() });

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
            ...(convo.length === 0
              ? [
                  {
                    role: "user" as const,
                    content: "Open the scene: greet the learner in character. Return the json.",
                  },
                ]
              : convo),
          ],
        }),
      });
      if (!res.ok) return FALLBACK;
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = json.choices?.[0]?.message?.content ?? "";
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) return FALLBACK;
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<SimReply>;
      return {
        ...FALLBACK,
        ...parsed,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
        ended: Boolean(parsed.ended),
      };
    } catch {
      return FALLBACK;
    }
  });
