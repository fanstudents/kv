import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });
}

describe("platform import boundaries", () => {
  it("keeps the Runtime Kernel independent from frameworks and providers", () => {
    const forbidden = [
      "next/",
      "@supabase/",
      "googleapis",
      "@/lib/openai",
      "@/lib/google",
      "@/lib/line",
      "@/lib/supabase",
    ];

    for (const path of sourceFiles(join(process.cwd(), "src", "platform"))) {
      const source = readFileSync(path, "utf8");
      for (const specifier of forbidden) {
        expect(source, `${path} imports ${specifier}`).not.toContain(`from "${specifier}`);
      }
    }
  });

  it("keeps product modules independent from routes and provider clients", () => {
    const forbidden = [
      "next/",
      "@supabase/",
      "googleapis",
      "@/app/",
      "@/lib/openai",
      "@/lib/google",
      "@/lib/line",
      "@/lib/supabase",
    ];

    for (const path of sourceFiles(join(process.cwd(), "src", "modules"))) {
      const source = readFileSync(path, "utf8");
      for (const specifier of forbidden) {
        expect(source, `${path} imports ${specifier}`).not.toContain(`from "${specifier}`);
      }
    }
  });
});
