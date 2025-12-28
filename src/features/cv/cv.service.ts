import { CvEvaluateSchema, type CvEvaluateInput } from "./schemas";
import { parseCV } from "@/features/ai/ai.service";
import { matchSkillsAgainstTaxonomy } from "@/features/skills/skill-matching.service";
import { fetchSkillsServer } from "@/features/skills/skill.repo";
import { upsertSkillState } from "@/features/skills/skill-state.service";
import { fetchUserCourses, fetchUserCourseTags, fetchCourseSkillMappings } from "@/features/courses/courses.repo";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { createSupabaseAdminClient } from "@/core/supabase/admin";
import { slugify } from "@/core/utils/slug";

function fallbackDetectSkills(text: string) {
  const snippets = text
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return snippets.slice(0, 30).map((s) => ({ skill_phrase: s }));
}

async function ensureCustomSkills(proposed: any[]) {
  if (!proposed.length) return [];
  const supabase = createSupabaseAdminClient();
  const created: string[] = [];
  for (const s of proposed) {
    const id = `custom.${slugify(s.name)}`;
    await supabase
      .from("skills")
      .upsert({
        id,
        category: s.category ?? "LANGUAGE",
        name: s.name,
        aliases: s.aliases ?? [],
        parent_skill_id: s.parent_skill_id ?? null,
        created_by: "ai",
        created_at: new Date().toISOString(),
      })
      .eq("id", id);
    created.push(id);
  }
  return created;
}

async function applyCourseMappings(userId: string, req?: Request) {
  const courses = await fetchUserCourses(userId, req);
  if (!courses.length) return { mappedSkills: [] as string[] };

  const tags = await fetchUserCourseTags(userId, req);
  const mappings = await fetchCourseSkillMappings(req);
  const byCourse = new Map<string, string>();
  tags.forEach((t) => byCourse.set(t.course_id, t.course_key));

  const mappedSkills: string[] = [];
  for (const c of courses) {
    const key = byCourse.get(c.id);
    if (!key) continue;
    const weights = mappings.filter((m) => m.course_key === key);
    for (const w of weights) {
      mappedSkills.push(w.skill_id);
    }
  }
  return { mappedSkills };
}

export async function evaluateCv(userId: string, raw: unknown, req?: Request) {
  const input: CvEvaluateInput = CvEvaluateSchema.parse(raw);
  const supabase = await createSupabaseServerClient(req);

  const { data: cvRow, error: cvErr } = await supabase
    .from("cvs")
    .insert({
      user_id: userId,
      storage_path: null,
      extracted_text: input.cv_text,
      parsed_json: { education_level: input.education_level ?? null },
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (cvErr) throw new Error(cvErr.message);

  let parsed: any | null = null;
  try {
    parsed = await parseCV(input.cv_text);
  } catch {
    parsed = {
      detected: fallbackDetectSkills(input.cv_text),
      proposed_new_skills: [],
      issues: [],
      sections: {},
    };
  }

  const skills = await fetchSkillsServer(req);
  const matched = matchSkillsAgainstTaxonomy(
    parsed.detected?.map((d: any) => ({ phrase: d.skill_phrase })) ?? [],
    skills
  );

  const newSkillIds = await ensureCustomSkills(parsed.proposed_new_skills ?? []);
  const allSkillIds = [...new Set([...matched.matches.map((m) => m.skill_id), ...newSkillIds])];

  const { mappedSkills } = await applyCourseMappings(userId, req);
  const combinedSkills = [...new Set([...allSkillIds, ...mappedSkills])];

  for (const skillId of combinedSkills) {
    await upsertSkillState(
      userId,
      skillId,
      {
        delta: 0.6,
        confidenceBoost: 0.1,
        reason: {
          source: "cv",
          cv_id: cvRow.id,
          education_level: input.education_level ?? null,
          transcript_used: Boolean(input.transcript_text),
        },
      },
      req
    );
  }

  return {
    cv_id: cvRow.id,
    matched: matched.matches,
    created_skills: newSkillIds,
    mapped_from_courses: mappedSkills,
  };
}
