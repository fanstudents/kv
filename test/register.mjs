import { register } from "node:module";
import { pathToFileURL } from "node:url";

// 把 ts-loader.mjs 掛上去。獨立成一個檔案而不是寫在 npm script 的 data: URL 裡，
// 純粹是為了讓那行指令還讀得懂。
register("./ts-loader.mjs", import.meta.url);

export { pathToFileURL };
