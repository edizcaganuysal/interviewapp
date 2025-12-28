import { JobRequirementInputSchema } from "./schemas";
import {
  deleteJobRequirement,
  listJobRequirements,
  upsertJobRequirement,
  updateJobRequirement,
} from "./jobs.repo";

export async function getJobRequirements(jobId: string, req?: Request) {
  return listJobRequirements(jobId, req);
}

export async function addJobRequirement(jobId: string, raw: unknown, req?: Request) {
  const parsed = JobRequirementInputSchema.parse(raw);
  return upsertJobRequirement(jobId, parsed, req);
}

export async function patchJobRequirement(id: string, raw: unknown, req?: Request) {
  const partial = JobRequirementInputSchema.partial().parse(raw);
  await updateJobRequirement(id, partial, req);
}

export async function removeJobRequirement(id: string, req?: Request) {
  await deleteJobRequirement(id, req);
}
