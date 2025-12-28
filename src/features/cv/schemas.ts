import { z } from "zod";

export const CvEvaluateSchema = z.object({
  cv_text: z.string().min(50),
  education_level: z.string().optional(),
  transcript_text: z.string().optional(),
});

export type CvEvaluateInput = z.infer<typeof CvEvaluateSchema>;
