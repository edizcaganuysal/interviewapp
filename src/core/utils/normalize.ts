export function normalizeText(input: string) {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function basicSingularize(word: string) {
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("ses")) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

export function normalizedTokens(input: string) {
  return normalizeText(input)
    .split(" ")
    .map((w) => basicSingularize(w))
    .filter(Boolean);
}
