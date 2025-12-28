import { z } from "zod";

export const SkillSchema = z.object({
  id: z.string(),
  category: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  parent_skill_id: z.string().nullable(),
  created_by: z.string().optional(),
});

export type Skill = z.infer<typeof SkillSchema>;
