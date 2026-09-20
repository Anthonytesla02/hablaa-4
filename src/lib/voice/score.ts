/**
 * Pronunciation scoring — client & server safe.
 *
 * Compares what the learner said with the target phrase using a light
 * phonetic folding (so accents, silent letters and Spanish sound pairs don't
 * count as mistakes) plus a per-word edit-distance alignment, so a small slip
 * inside a word is a near-miss instead of a total miss.
 */

export type WordState = "hit" | "near" | "off" | "missed";
export type Verdict = "great" | "close" | "retry";

export type WordMark = { word: string; state: WordState };

export type VoiceScore = {
  /** 0–100 */
  score: number;
  verdict: Verdict;
  words: WordMark[];
  /** Words the learner said that weren't in the target. */
  extra: string[];
};

/** Strip case, punctuation and diacritics. */
export function plain(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fold letters that sound alike in Spanish (and in most learner errors), so
 * "boy"/"voy", "llamo"/"yamo", "cerveza"/"servesa", "hola"/"ola" all match.
 */
export function phonetic(word: string): string {
  return plain(word)
    .replace(/h/g, "")
    .replace(/qu/g, "k")
    .replace(/ce|ci/g, (m) => `s${m[1]}`)
    .replace(/ge|gi/g, (m) => `j${m[1]}`)
    .replace(/gu(e|i)/g, "g$1")
    .replace(/ll/g, "y")
    .replace(/v/g, "b")
    .replace(/z/g, "s")
    .replace(/c/g, "k")
    .replace(/[àáâä]/g, "a")
    .replace(/(.)\1+/g, "$1");
}

function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = row;
  }
  return prev[b.length]!;
}

/** How closely two single words match, 0–1. */
function wordSimilarity(said: string, target: string): number {
  const a = phonetic(said);
  const b = phonetic(target);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const max = Math.max(a.length, b.length);
  return Math.max(0, 1 - distance(a, b) / max);
}

const HIT = 0.86;
const NEAR = 0.62;

/** Score a spoken attempt against the expected phrase. */
export function scoreSpeech(transcript: string, expected: string): VoiceScore {
  const targets = plain(expected).split(" ").filter(Boolean);
  const said = plain(transcript).split(" ").filter(Boolean);

  if (targets.length === 0) {
    return { score: 0, verdict: "retry", words: [], extra: [] };
  }
  if (said.length === 0) {
    return {
      score: 0,
      verdict: "retry",
      words: targets.map((word) => ({ word, state: "missed" as WordState })),
      extra: [],
    };
  }

  const used = new Set<number>();
  const words: WordMark[] = [];
  let total = 0;

  // Align in order, allowing a small look-ahead window so an inserted or
  // dropped word doesn't cascade into every following word being wrong.
  let cursor = 0;
  for (const target of targets) {
    let best = { sim: 0, index: -1 };
    for (let i = Math.max(0, cursor - 1); i < Math.min(said.length, cursor + 4); i++) {
      if (used.has(i)) continue;
      const sim = wordSimilarity(said[i]!, target);
      if (sim > best.sim) best = { sim, index: i };
    }
    if (best.index >= 0 && best.sim >= NEAR) {
      used.add(best.index);
      cursor = best.index + 1;
    }
    const state: WordState =
      best.sim >= HIT ? "hit" : best.sim >= NEAR ? "near" : best.sim > 0.3 ? "off" : "missed";
    total += best.sim >= HIT ? 1 : best.sim >= NEAR ? 0.7 : best.sim > 0.3 ? 0.3 : 0;
    words.push({ word: target, state });
  }

  const extra = said.filter((_, i) => !used.has(i));
  // Rambling past the target costs a little, but never wipes out a good attempt.
  const noise = Math.min(0.25, (extra.length / targets.length) * 0.2);
  const score = Math.round(Math.max(0, total / targets.length - noise) * 100);

  const verdict: Verdict = score >= 82 ? "great" : score >= 55 ? "close" : "retry";
  return { score, verdict, words, extra };
}

/** XP bonus for a spoken attempt. */
export function voiceXp(verdict: Verdict): number {
  return verdict === "great" ? 5 : verdict === "close" ? 2 : 0;
}
