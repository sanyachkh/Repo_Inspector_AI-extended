import { changedFiles, HEAD_REF, resolveBaseRef } from "./git.js";
import type { ReviewRequest, ReviewResult } from "./types.js";
import { runValidations } from "./validation.js";

export async function reviewRepository(request: ReviewRequest): Promise<ReviewResult> {
  const baseRef = resolveBaseRef(request.repositoryPath, request.baseRef);
  const files = changedFiles(request.repositoryPath, baseRef);
  const validations = await runValidations(
    request.validationCommands ?? [],
    request.repositoryPath,
  );
  return {
    repositoryPath: request.repositoryPath,
    baseRef,
    headRef: HEAD_REF,
    changedFiles: files,
    validations,
    summary: {
      filesChanged: files.length,
      validationsRun: validations.length,
      validationsFailed: validations.filter((v) => v.status === "failed").length,
      validationsErrored: validations.filter((v) => v.status === "errored").length,
    },
  };
}
