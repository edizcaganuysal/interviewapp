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
  const content = await callOpenAI(
    `Extract job requirements as JSON.`,
    "JobDescriptionParseOutput"
  );
  return JobDescriptionParseOutputSchema.parse(JSON.parse(content));
}

export async function parseCV(text: string) {
  const content = await callOpenAI(`Extract skills from CV text as JSON.`, "CVParseOutput");
  return CVParseOutputSchema.parse(JSON.parse(content));
}

export async function rewriteCVSuggestions(text: string) {
  const content = await callOpenAI(`Provide rewrite suggestions for CV text as JSON.`, "CVRewriteSuggestionsOutput");
  return CVRewriteSuggestionsOutputSchema.parse(JSON.parse(content));
}
