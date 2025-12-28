import { CVParseOutputSchema, CVRewriteSuggestionsOutputSchema, JobDescriptionParseOutputSchema } from "./schemas";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(prompt: string, schemaName: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `You are a parser. Output ONLY JSON matching schema: ${schemaName}` },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OPENAI_ERROR ${text}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "";
  return content;
}

export async function parseJobDescription(text: string) {
  try {
    const content = await callOpenAI(
      `Extract structured job requirements as strict JSON following schema JobDescriptionParseOutput.
- For each requirement, include skill_phrase, required_level_0_10 (minimum acceptable), importance_1_5, required_months_experience, strictness ("mandatory"|"preferred"|"nice_to_have").
- Keep phrasing concise, no invented skills. Use the job description only.`,
      "JobDescriptionParseOutput"
    );
    return JobDescriptionParseOutputSchema.parse(JSON.parse(content));
  } catch (err) {
    console.error("parseJobDescription failed, falling back to empty requirements", err);
    return { requirements: [], proposed_new_skills: [] };
  }
}

export async function parseCV(text: string) {
  const content = await callOpenAI(
    `Extract skills from CV/resume text as strict JSON matching schema CVParseOutput.
- detected[].skill_phrase must be copied from the CV.
- Include evidence_snippets[], evidence_location (e.g., "experience", "projects", "education"), months_experience (integer months), estimated_level_0_10 (0 beginner, 10 expert).
- Do NOT invent experience; if unclear, set months_experience=0 and evidence_location="unknown".
- proposed_new_skills only when no close match exists.`,
    "CVParseOutput"
  );
  return CVParseOutputSchema.parse(JSON.parse(content));
}

export async function rewriteCVSuggestions(text: string) {
  const content = await callOpenAI(`Provide rewrite suggestions for CV text as JSON.`, "CVRewriteSuggestionsOutput");
  return CVRewriteSuggestionsOutputSchema.parse(JSON.parse(content));
}
