import { normalizedTokens } from "@/core/utils/normalize";
import { slugify } from "@/core/utils/slug";
import type { Skill } from "./schemas";

type DetectedPhrase = { phrase: string; requiredLevel?: number; importance?: number };

export type SkillMatchResult = {
  matches: { phrase: string; skill_id: string }[];
  proposedNew: {
    id: string;
    name: string;
    category: string;
    aliases: string[];
    parent_skill_id: string | null;
    short_definition: string;
  }[];
};

function normalizeForMatch(text: string) {
  return normalizedTokens(text).join(" ");
}

export function matchSkillsAgainstTaxonomy(detected: DetectedPhrase[], skills: Skill[]): SkillMatchResult {
  const nameIndex = new Map<string, Skill>();
  const aliasIndex = new Map<string, Skill>();
  const normIndex = new Map<string, Skill>();

  for (const skill of skills) {
    nameIndex.set(skill.name.toLowerCase(), skill);
    (skill.aliases || []).forEach((a) => aliasIndex.set(a.toLowerCase(), skill));

    const norm = normalizeForMatch(skill.name);
    if (norm) normIndex.set(norm, skill);
    for (const a of skill.aliases || []) {
      const normAlias = normalizeForMatch(a);
      if (normAlias) normIndex.set(normAlias, skill);
    }
  }

  const matches: { phrase: string; skill_id: string }[] = [];
  const proposedNew: SkillMatchResult["proposedNew"] = [];

  for (const item of detected) {
    const phrase = item.phrase;
    const lower = phrase.toLowerCase();
    const norm = normalizeForMatch(phrase);

    const direct = nameIndex.get(lower) || aliasIndex.get(lower) || normIndex.get(norm || "");
    if (direct) {
      matches.push({ phrase, skill_id: direct.id });
      continue;
    }

    // Placeholder semantic similarity gate: fall back to normalized containment
    const maybe = Array.from(normIndex.entries()).find(([k]) => norm.includes(k) || k.includes(norm));
    if (maybe?.[1]) {
      matches.push({ phrase, skill_id: maybe[1].id });
      continue;
    }

    const id = `custom.${slugify(phrase)}`;
    const aliases: string[] = [];
    const normalizedExisting = new Set(normIndex.keys());
    if (!normalizedExisting.has(norm)) {
      proposedNew.push({
        id,
        name: phrase,
        category: "LANGUAGE",
        aliases,
        parent_skill_id: null,
        short_definition: phrase,
      });
    }
  }

  return { matches, proposedNew };
}
