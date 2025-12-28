export type ExperienceRequirement = {
  skill_id: string;
  required_months: number;
  strictness: "mandatory" | "preferred" | "nice_to_have";
};

export function experienceScore(
  userMonths: number,
  req: ExperienceRequirement
) {
  if (!req.required_months) return 1;
  const ratio = userMonths / req.required_months;
  const clamp = Math.max(0, Math.min(1.5, ratio));
  const base = clamp >= 1 ? 1 : clamp; // 0..1
  if (req.strictness === "mandatory") return base * 1.0;
  if (req.strictness === "preferred") return base * 0.9 + 0.1;
  return base * 0.8 + 0.2;
}
