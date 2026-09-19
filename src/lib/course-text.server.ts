/**
 * Every phrase the course can legitimately ask to be spoken.
 *
 * Speech for these phrases is generated once and then served from the shared
 * cache for all users, forever. Anything outside this set counts against the
 * requesting user's daily budget, so the speech endpoint can never be turned
 * into a free, unlimited text-to-speech service.
 */
import w1 from "@/data/course/spanish_week_1.json";
import w2 from "@/data/course/spanish_week_2.json";
import w3 from "@/data/course/spanish_week_3.json";
import w4 from "@/data/course/spanish_week_4.json";
import content from "@/data/content.json";

export function normalizeSpeech(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}?!. ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let cachedSet: Set<string> | null = null;

/** Walk the authored content and collect every target-language string. */
function collect(node: unknown, out: Set<string>, depth = 0): void {
  if (depth > 12) return;
  if (typeof node === "string") {
    const n = normalizeSpeech(node);
    if (n) out.add(n);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collect(item, out, depth + 1);
    return;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node as Record<string, unknown>)) {
      collect(value, out, depth + 1);
    }
  }
}

/**
 * Built once per server instance. Deliberately generous (it also contains the
 * English side of the content), because the point is to bound the endpoint to
 * authored material, not to police which authored line is played.
 */
export function courseSpeechSet(): Set<string> {
  if (cachedSet) return cachedSet;
  const set = new Set<string>();
  for (const week of [w1, w2, w3, w4]) collect(week, set);
  collect((content as Record<string, unknown>)["curriculum"], set);
  collect((content as Record<string, unknown>)["phrase_bank"], set);
  cachedSet = set;
  return set;
}

/** True when this exact phrase comes from the authored course content. */
export function isCourseText(text: string): boolean {
  const n = normalizeSpeech(text);
  if (!n) return false;
  const set = courseSpeechSet();
  if (set.has(n)) return true;
  // Placeholder templates ("me llamo ____") are spoken with the blanks read as
  // a pause, so compare with the blanks collapsed too.
  return set.has(n.replace(/ ?… ?/g, " ").replace(/\s+/g, " ").trim());
}
