import { listQuestions, createQuestion, updateQuestion, deleteQuestion } from "./questions.repo";
import { QuestionInputSchema } from "./schemas";

export async function getQuestionsPage(input: { page: number; pageSize: number }) {
  const page = Number.isFinite(input.page) ? Math.max(1, input.page) : 1;
  const pageSize = Math.min(50, Math.max(5, input.pageSize));

  const offset = (page - 1) * pageSize;
  const { items, total } = await listQuestions({ limit: pageSize, offset });

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function createQuestionUseCase(raw: unknown) {
  const parsed = QuestionInputSchema.parse(raw);
  return createQuestion(parsed);
}

export async function updateQuestionUseCase(id: string, raw: unknown) {
  const parsed = QuestionInputSchema.partial().parse(raw);
  await updateQuestion(id, parsed);
}

export async function deleteQuestionUseCase(id: string) {
  await deleteQuestion(id);
}
