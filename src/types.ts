export type ChangedFile = {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "copied" | "untracked";
  // Source path, set for renamed and copied files.
  oldPath?: string;
};

export type ValidationResult = {
  command: string;
  // passed: exit 0; failed: ran and exited non-zero; errored: never ran meaningfully
  status: "passed" | "failed" | "errored";
  output: string;
};

export type ReviewRequest = {
  repositoryPath: string;
  baseRef?: string;
  validationCommands?: string[];
};

export type ReviewResult = {
  repositoryPath: string;
  baseRef: string;
  headRef: string;
  changedFiles: ChangedFile[];
  validations: ValidationResult[];
  summary: {
    filesChanged: number;
    validationsRun: number;
    validationsFailed: number;
    validationsErrored: number;
  };
};