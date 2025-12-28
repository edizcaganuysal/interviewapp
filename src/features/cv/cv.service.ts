import { CvEvaluateSchema, type CvEvaluateInput } from "./schemas";
import { parseCV, rewriteCVSuggestions } from "@/features/ai/ai.service";
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
  return snippets.slice(0, 30).map((s) => ({ skill_phrase: s, months_experience: 0, evidence_location: "unknown" }));
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

  // Keep existing file metadata/base64 when re-evaluating
  const { data: existing } = await supabase
    .from("cvs")
    .select("id,parsed_json,extracted_text,storage_path,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const parsedExisting = existing?.parsed_json ?? {};
  const mergedParsed = {
    ...parsedExisting,
    education_level: input.education_level ?? parsedExisting.education_level ?? null,
    transcript_text: input.transcript_text ?? parsedExisting.transcript_text ?? "",
  };

  let cvId: string | null = existing?.id ?? null;

  if (existing?.id) {
    const { error: updErr } = await supabase
      .from("cvs")
      .update({
        extracted_text: input.cv_text,
        parsed_json: mergedParsed,
        created_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (updErr) throw new Error(updErr.message);
  } else {
    const { data: cvRow, error: cvErr } = await supabase
      .from("cvs")
      .insert({
        user_id: userId,
        storage_path: "",
        extracted_text: input.cv_text,
        parsed_json: mergedParsed,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (cvErr) throw new Error(cvErr.message);
    cvId = cvRow.id;
  }

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
  const detectedList = parsed.detected ?? [];
  const matched = matchSkillsAgainstTaxonomy(
    detectedList.map((d: any) => ({ phrase: d.skill_phrase })),
    skills
  );
  const detectionByPhrase = new Map(
    detectedList.map((d: any) => [String(d.skill_phrase || "").toLowerCase(), d])
  );
  const detectionBySkillId = new Map<string, any>();
  matched.matches.forEach((m) => {
    const det = detectionByPhrase.get(m.phrase.toLowerCase());
    if (det) detectionBySkillId.set(m.skill_id, det);
  });

  function workMonths(det: any) {
    const loc = String(det?.evidence_location ?? "").toLowerCase();
    const isWork =
      loc.includes("intern") ||
      loc.includes("work") ||
      loc.includes("employment") ||
      loc.includes("experience") ||
      loc.includes("full-time") ||
      loc.includes("part-time");
    if (!isWork) return 0;
    return Number(det?.months_experience ?? 0) || 0;
  }

  const newSkillIds = await ensureCustomSkills(parsed.proposed_new_skills ?? []);
  const allSkillIds = [...new Set([...matched.matches.map((m) => m.skill_id), ...newSkillIds])];

  const { mappedSkills } = await applyCourseMappings(userId, req);
  const combinedSkills = [...new Set([...allSkillIds, ...mappedSkills])];

  for (const skillId of combinedSkills) {
    const detected =
      detectionBySkillId.get(skillId) ||
      detectedList.find((d: any) => d.skill_id_optional === skillId);
    const months = workMonths(detected);
    const levelFromCv = typeof detected?.estimated_level_0_10 === "number" ? detected.estimated_level_0_10 : undefined;
    await upsertSkillState(
      userId,
      skillId,
      {
        delta: levelFromCv === undefined ? 0.6 : 0,
        setLevel: levelFromCv,
        confidenceBoost: 0.1,
        monthsExperience: months,
        reason: {
          source: "cv",
          cv_id: cvId ?? undefined,
          education_level: input.education_level ?? null,
          transcript_used: Boolean(input.transcript_text),
          evidence_location: detected?.evidence_location ?? "unknown",
        },
      },
      req
    );
  }

  return {
    cv_id: cvId ?? undefined,
    matched: matched.matches,
    created_skills: newSkillIds,
    mapped_from_courses: mappedSkills,
    cv_issues: parsed.issues ?? [],
    hidden_skills: matched.matches
      .filter((m) => {
        const det = detectionBySkillId.get(m.skill_id);
        return !det?.evidence_location || det.evidence_location === "unknown";
      })
      .map((m) => m.skill_id),
  };
}
