import { z } from "zod";

export const RequirementSchema = z.object({
  skill_phrase: z.string(),
  skill_id_optional: z.string().optional().nullable(),
  required_level_0_10: z.number(),
  importance_1_5: z.number(),
});

export const ProposedSkillSchema = z.object({
  name: z.string(),
  category: z.string(),
  aliases: z.array(z.string()).default([]),
  parent_skill_id: z.string().nullable(),
  short_definition: z.string(),
});

export const JobDescriptionParseOutputSchema = z.object({
  requirements: z.array(RequirementSchema),
  proposed_new_skills: z.array(ProposedSkillSchema),
});

export const CvDetectedSkillSchema = z.object({
  skill_phrase: z.string(),
  skill_id_optional: z.string().optional().nullable(),
  evidence_snippets: z.array(z.string()),
});

export const CvIssueSchema = z.object({
  type: z.string(),
  message: z.string(),
  severity: z.string(),
});

export const CVParseOutputSchema = z.object({
  detected: z.array(CvDetectedSkillSchema),
  proposed_new_skills: z.array(ProposedSkillSchema),
  issues: z.array(CvIssueSchema),
  sections: z.record(z.any()),
});

export const CVRewriteSuggestionsOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      before: z.string(),
      after: z.string(),
      rationale: z.string(),
      needs_user_confirmation: z.boolean(),
      forbidden_invention_check: z.boolean(),
    })
  ),
});

export const SkillNoteParseOutputSchema = z.object({
  skill_id: z.string(),
  evidence_adjustments: z.array(z.any()),
  proposed_new_skills: z.array(ProposedSkillSchema),
});

export type JobDescriptionParseOutput = z.infer<typeof JobDescriptionParseOutputSchema>;
export type CVParseOutput = z.infer<typeof CVParseOutputSchema>;
export type CVRewriteSuggestionsOutput = z.infer<typeof CVRewriteSuggestionsOutputSchema>;
