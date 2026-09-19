/** Shared text normalization + comparison — safe for both client and server. */

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type PronunciationGrade = "exact" | "close" | "miss";

export function compareTranscript(
  transcript: string,
  expected: string,
): { grade: PronunciationGrade; overlap: number } {
  const said = normalize(transcript);
  const target = normalize(expected);

  if (!said) return { grade: "miss", overlap: 0 };

  // Exact match (after normalization)
  if (said === target) return { grade: "exact", overlap: 1 };

  const targetWords = target.split(" ").filter((w) => w.length > 0);
  const saidWords = said.split(" ").filter((w) => w.length > 0);

  if (targetWords.length === 0) return { grade: "miss", overlap: 0 };

  // Word overlap ratio
  let hits = 0;
  for (const w of targetWords) {
    if (said.includes(w)) hits++;
  }
  const overlap = hits / targetWords.length;

  // Also check if all target words appear in order (substring match)
  const isSubsequence = targetWords.every((w) => said.includes(w));

  if (overlap >= 0.85 || isSubsequence) return { grade: "exact", overlap };
  if (overlap >= 0.6) return { grade: "close", overlap };
  return { grade: "miss", overlap };
}
