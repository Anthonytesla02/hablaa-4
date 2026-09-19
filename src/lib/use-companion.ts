import { useMemo } from "react";
import {
  characterById,
  charactersFor,
  personalityById,
  type CompanionBrief,
} from "@/lib/companions";
import { policyForRoastDial } from "@/lib/severity";
import { useApp } from "@/lib/store";

/**
 * Resolves the stored companion config into everything the UI and the server
 * calls need: the character, the personality and the memory of what this
 * learner keeps getting wrong.
 */
export function useCompanion() {
  const config = useApp((s) => s.companion);
  const mistakeMemory = useApp((s) => s.mistakeMemory);
  const langId = useApp((s) => s.profile?.langId ?? "spanish");

  return useMemo(() => {
    const character =
      characterById(config?.characterId) ?? charactersFor(langId)[0] ?? null;
    // A character carries their own teaching style unless the learner overrode it.
    const personality = personalityById(config?.personalityId ?? character?.personalityId);

    const notes = Object.values(mistakeMemory)
      .filter((m) => m.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
    const memory = notes.map((m) => `${m.tag} (${m.count}\u00d7) \u2014 ${m.detail}`);

    const interjectOnly = Boolean(character?.interjectOnly || personality.id === "philly");

    const brief: CompanionBrief = {
      personality: personality.behaviour,
      characterName: character?.name ?? "",
      characterBio: character ? `${character.age}, ${character.region}. ${character.bio}` : "",
      dialect: character?.dialect ?? "",
      slang: config?.slang ?? 1,
      roast: config?.roast ?? 1,
      localMode: config?.localMode ?? true,
      noTranslate: config?.noTranslate ?? false,
      interjectOnly,
      memory,
    };

    return {
      config,
      personality,
      character,
      memory,
      notes,
      brief,
      interjectOnly,
      /** Locale used when the tutor coaches in their own accent. */
      coachLocale: character?.voiceLocale ?? null,
      policy: policyForRoastDial(config?.roast ?? 1),
      ready: Boolean(config),
    };
  }, [config, mistakeMemory, langId]);
}
