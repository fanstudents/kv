import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateCost } from "@/lib/ai-usage";

// 成本估算是預算護欄的地基：算錯的話，閘門要嘛擋不住失控的迴圈，
// 要嘛在還有額度時就把所有 AI 呼叫停掉。而它平常沒有任何回饋——
// 帳單一個月後才來，那時已經來不及。

test("依 input／output 分別計價", () => {
  // gpt-4o-mini：input $0.15／output $0.6 每百萬 token
  const cost = estimateCost("gpt-4o-mini", { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 });
  assert.ok(Math.abs(cost - 0.75) < 1e-9, `應為 0.75，實際 ${cost}`);
});

test("output 比 input 貴——不能用單一費率算", () => {
  const inputHeavy = estimateCost("gpt-4o", { prompt_tokens: 100_000, completion_tokens: 0 });
  const outputHeavy = estimateCost("gpt-4o", { prompt_tokens: 0, completion_tokens: 100_000 });
  assert.ok(outputHeavy > inputHeavy, "同樣的 token 數，輸出應該比輸入貴");
});

test("不認得的模型回 0，而不是丟例外", () => {
  // 這是刻意的取捨：新模型上線時不該讓整個呼叫鏈掛掉。
  // 代價是那筆花費會被低估成 0，所以 PRICING 要跟著 OpenAI 調價一起維護。
  assert.equal(estimateCost("gpt-未來-9", { prompt_tokens: 1000, completion_tokens: 1000 }), 0);
});

test("沒有 usage 欄位時當成 0，不會算出 NaN", () => {
  assert.equal(estimateCost("gpt-4o", {}), 0);
});
