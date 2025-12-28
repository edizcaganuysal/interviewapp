import { z } from "zod";

export const AttemptInputSchema = z.object({
  question_id: z.string().min(1),
  job_id: z.string().optional().nullable(),
  solved: z.boolean(),
  time_spent_minutes: z.number().int().min(1).max(300),
  hints_used: z.number().int().min(0).max(2),
  perceived_difficulty: z.number().int().min(1).max(10),
  confidence_rating: z.number().int().min(1).max(5),
  notes: z.string().max(2000).optional().nullable(),
});

export type AttemptInput = z.infer<typeof AttemptInputSchema>;
