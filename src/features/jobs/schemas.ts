import { z } from "zod";

export const JobRequirementInputSchema = z.object({
  skill_id: z.string().min(1),
  required_level: z.number().min(0).max(10),
  importance: z.number().int().min(1).max(5),
});

export type JobRequirementInput = z.infer<typeof JobRequirementInputSchema>;
