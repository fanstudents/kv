import { describe, expect, it } from "vitest";
import {
  classifyQualityScope,
  classifySchemaScope,
  evaluateQualityScope,
  evaluateSchemaScope,
} from "../../scripts/ci-scope.mjs";

describe("CI schema scope policy", () => {
  it("skips the expensive replay for documentation-only changes", () => {
    expect(classifySchemaScope(["README.md", "docs/PRODUCTIZATION_PLAN.md"])).toMatchObject({
      required: false,
    });
  });

  it("skips replay for application and ordinary unit-test changes", () => {
    expect(classifySchemaScope(["src/app/dashboard/page.tsx", "tests/unit/agent-page-state.test.ts"])).toMatchObject({
      required: false,
    });
  });

  it("keeps migrations, generated types, package changes, and unknown files fail-closed", () => {
    for (const paths of [
      ["supabase/migrations/20260816120000_example.sql"],
      ["src/lib/database.types.ts"],
      ["package-lock.json"],
      ["scripts/new-release-check.mjs"],
      ["tests/integration/schema-contract.test.ts"],
    ]) {
      expect(classifySchemaScope(paths).required).toBe(true);
    }
  });

  it("runs the full gate when the comparison range cannot be resolved", () => {
    expect(evaluateSchemaScope({ base: "", head: "abc1234" })).toMatchObject({
      required: true,
      reason: expect.stringContaining("fail closed"),
    });
  });
});

describe("CI quality scope policy", () => {
  it("skips heavy quality work only for reader-facing documentation", () => {
    expect(classifyQualityScope(["README.md", "docs/PRODUCTIZATION_PLAN.md"])).toMatchObject({
      required: false,
      reason: expect.stringContaining("documentation-only"),
    });
  });

  it("keeps source, tests, dependencies, workflows, public assets, and unknown files fail-closed", () => {
    for (const paths of [
      ["src/app/dashboard/page.tsx"],
      ["tests/unit/ci-scope.test.ts"],
      ["package-lock.json"],
      [".github/workflows/ci.yml"],
      ["public/avatars/vivian.webp"],
      ["unexpected/file.txt"],
    ]) {
      expect(classifyQualityScope(paths).required).toBe(true);
    }
  });

  it("runs the full quality gate when the comparison range cannot be resolved", () => {
    expect(evaluateQualityScope({ base: "", head: "abc1234" })).toMatchObject({
      required: true,
      reason: expect.stringContaining("fail closed"),
    });
  });
});
