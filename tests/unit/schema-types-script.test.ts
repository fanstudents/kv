import { describe, expect, it } from "vitest";
import { normalizeGeneratedTypes } from "../../scripts/schema-types.mjs";

describe("schema type generator normalization", () => {
  it("normalizes line endings and trailing blank lines only", () => {
    const generated = "export type Database = {};\r\n\r\n";

    expect(normalizeGeneratedTypes(generated)).toBe("export type Database = {};\n");
  });

  it("preserves the generated body so semantic drift remains visible", () => {
    const generated = "export type Database = {\n  public: {\n    Tables: {};\n  };\n}\r\n\r\n";

    expect(normalizeGeneratedTypes(generated)).toContain("Tables: {};");
    expect(normalizeGeneratedTypes(generated)).not.toBe(
      normalizeGeneratedTypes(generated.replace("Tables", "Functions")),
    );
  });
});
