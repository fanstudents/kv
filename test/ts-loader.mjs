import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

// 最小的模組解析外掛，讓 node --test 跑得動這個專案的 TypeScript：
//   1. 把 `@/x` 換成 `<repo>/src/x`（對應 tsconfig 的 paths）
//   2. 補上省略掉的副檔名（TS 寫 `./supabase`，Node ESM 需要 `./supabase.ts`）
// 型別本身由 Node 內建的 --experimental-strip-types 去掉，所以不需要任何額外套件。
//
// 刻意不引入 tsx／vitest／jest：這裡要測的是幾個純函式，
// 為了它們多裝一整套測試框架與其依賴樹並不划算。

const SRC = new URL("../src/", import.meta.url);
const EXTENSIONS = [".ts", ".tsx", "/index.ts"];

function firstExisting(baseHref) {
  if (existsSync(fileURLToPath(baseHref))) return baseHref;
  for (const ext of EXTENSIONS) {
    const candidate = baseHref + ext;
    if (existsSync(fileURLToPath(candidate))) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  // `server-only` 的預設進入點就是一行 throw——它靠 bundler 的 react-server 條件
  // 換成空模組。Node 沒有那個條件，所以在這裡自己指到空模組，
  // 否則任何一個帶 `import "server-only"` 的檔案都測不了（也就是幾乎全部）。
  if (specifier === "server-only") {
    return {
      url: new URL("../node_modules/server-only/empty.js", import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier.startsWith("@/")) {
    const resolved = firstExisting(new URL(specifier.slice(2), SRC).href);
    if (resolved) return { url: resolved, shortCircuit: true };
  }

  if (specifier.startsWith(".") && context.parentURL) {
    const resolved = firstExisting(new URL(specifier, context.parentURL).href);
    if (resolved) return { url: resolved, shortCircuit: true };
  }

  return next(specifier, context);
}

// 刻意不實作 load hook：型別剝除交給 Node 內建的 --experimental-strip-types，
// 自己接手 load 反而會把 .ts 原樣當成 JS 丟給 V8，第一行 interface 就爆。

export { pathToFileURL };
