import { z } from "zod";

export const QuestionInputSchema = z.object({
  title: z.string().min(3).max(200),
  difficulty_weight: z.number().min(1).max(3),
  estimated_minutes: z.number().int().min(5).max(180),
  skill_ids: z.array(z.string().min(1)).min(1).max(3),
  url: z.string().url().nullable().optional(),
  is_mock: z.boolean().optional(),
});

export type QuestionInput = z.infer<typeof QuestionInputSchema>;
