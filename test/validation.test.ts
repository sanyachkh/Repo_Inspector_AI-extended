import { expect, it } from "vitest";
import { runValidation, runValidations } from "../src/validation.js";

it("reports a non-zero exit as failed, without throwing", async () => {
  const r = await runValidation("exit 3", process.cwd());
  expect(r.status).toBe("failed");
});

it("reports a missing binary as errored", async () => {
  const r = await runValidation("definitely-not-a-real-binary-xyz", process.cwd());
  expect(r.status).toBe("errored");
});

it("keeps stderr when stdout is also non-empty", async () => {
  const r = await runValidation("echo out; echo err 1>&2", process.cwd());
  expect(r.output).toContain("out");
  expect(r.output).toContain("err");
});

it("runs validations in order and returns one result each", async () => {
  const rs = await runValidations(["exit 0", "exit 1"], process.cwd());
  expect(rs.map((r) => r.status)).toEqual(["passed", "failed"]);
});
it("strips ANSI escape codes from output", async () => {
  const r = await runValidation("printf '\\033[1m\\033[32mgreen\\033[39m\\033[22m'", process.cwd());
  expect(r.output).toBe("green");
});
