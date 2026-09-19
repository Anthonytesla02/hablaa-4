/**
 * Mistake severity + reaction pacing.
 *
 * The tutor should NOT correct everything. Mistakes are graded 0-4 and only
 * ones at or above the threshold interrupt the conversation. Humour is rationed
 * so the joke never dies: probability, per-minute cap and no back-to-back roasts.
 */

export type Severity = 0 | 1 | 2 | 3 | 4;

export type RoastPolicy = {
  roast_probability: number;
  max_roasts_per_minute: number;
  max_consecutive_roasts: number;
  severity_threshold: Severity;
  encouragement_after_correction: boolean;
};

export const DEFAULT_POLICY: RoastPolicy = {
  roast_probability: 0.35,
  max_roasts_per_minute: 2,
  max_consecutive_roasts: 1,
  severity_threshold: 2,
  encouragement_after_correction: true,
};

/** Roast dial (0-3) tunes how often the character reacts dramatically. */
export function policyForRoastDial(roast: number): RoastPolicy {
  const p = [0, 0.2, 0.35, 0.6][Math.min(3, Math.max(0, roast))] ?? 0.35;
  return { ...DEFAULT_POLICY, roast_probability: p };
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  0: "CLEAN",
  1: "TINY SLIP",
  2: "WORTH FIXING",
  3: "MEANING CHANGED",
  4: "THAT WENT SOMEWHERE ELSE",
};

/** Tracks pacing across a single conversation. */
export class ReactionGate {
  private stamps: number[] = [];
  private consecutive = 0;
  constructor(private policy: RoastPolicy = DEFAULT_POLICY) {}

  /** Should this mistake stop the scene at all? */
  interrupts(severity: Severity) {
    return severity >= this.policy.severity_threshold;
  }

  /** Should the character react dramatically (roast) this time? */
  allowsRoast(severity: Severity) {
    if (severity < 2) return false;
    const now = Date.now();
    this.stamps = this.stamps.filter((t) => now - t < 60_000);
    if (this.stamps.length >= this.policy.max_roasts_per_minute) return false;
    if (this.consecutive >= this.policy.max_consecutive_roasts) return false;
    // Level 4 is the character's moment to shine.
    const chance = severity >= 4 ? Math.min(1, this.policy.roast_probability * 2) : this.policy.roast_probability;
    return Math.random() < chance;
  }

  /** Call after each turn with whether a roast was actually delivered. */
  record(roasted: boolean) {
    if (roasted) {
      this.stamps.push(Date.now());
      this.consecutive += 1;
    } else {
      this.consecutive = 0;
    }
  }

  get encourages() {
    return this.policy.encouragement_after_correction;
  }
}

const CLEAN_LINES = [
  "Okayyy. I see you.",
  "Okay… that was actually clean.",
  "Yeah, that's it. Keep that same energy.",
  "No notes. Move on.",
];

const COMEBACK_LINES = [
  "WHERE did that come from?",
  "Oh, so you DO know it. Alright.",
  "Look at that. Overnight fluency.",
];

const REPEAT_LINES = [
  "We've had this conversation three times now.",
  "Don't tell me we're about to have another one of these.",
  "Ah yes. This again.",
];

/** Little personality beats that make the character feel human. */
export function characterMoment(input: {
  severity: Severity;
  streakClean: number;
  brokeStruggle: boolean;
  repeatCount: number;
  repeatTag?: string;
}): string | null {
  if (input.repeatCount >= 3 && input.severity >= 2) {
    const line = REPEAT_LINES[Math.floor(Math.random() * REPEAT_LINES.length)]!;
    return input.repeatTag ? `${line} The ${input.repeatTag} situation.` : line;
  }
  if (input.severity === 0 && input.brokeStruggle) {
    return COMEBACK_LINES[Math.floor(Math.random() * COMEBACK_LINES.length)]!;
  }
  if (input.severity === 0 && input.streakClean > 0 && input.streakClean % 3 === 0) {
    return CLEAN_LINES[Math.floor(Math.random() * CLEAN_LINES.length)]!;
  }
  return null;
}

/** A running joke the character can call back to. */
export function runningJoke(tag: string, count: number) {
  if (count < 3) return null;
  return `Ah yes. The ${tag} situation. Round ${count}.`;
}
