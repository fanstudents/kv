import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyError } from "@/lib/agent-runs";

// 錯誤分類決定「要不要自動重試」：external／timeout／model 會排重試，
// data 不會。分錯的後果是實質的——把資料設定錯誤當成外部故障，
// 就會對著同一個必然失敗的呼叫重試三次、燒三份額度。

test("逾時與網路層錯誤分類為 timeout", () => {
  assert.equal(classifyError(new Error("fetch failed")), "timeout");
  assert.equal(classifyError(new Error("connect ETIMEDOUT 1.2.3.4:443")), "timeout");
  assert.equal(classifyError(new Error("socket hang up ECONNRESET")), "timeout");
});

test("AbortSignal.timeout 丟出的 TimeoutError 也算 timeout", () => {
  const err = new Error("The operation was aborted due to timeout");
  err.name = "TimeoutError";
  assert.equal(classifyError(err), "timeout");
});

test("限流與 5xx 分類為 external（值得重試）", () => {
  assert.equal(classifyError(new Error("OpenAI request failed (429): rate limit")), "external");
  assert.equal(classifyError(new Error("LINE 回應 503：service unavailable")), "external");
});

test("預算用盡分類為 data——重試一百次還是會被同一道閘門擋下", () => {
  assert.equal(classifyError(new Error("今日 AI 用量已達上限（US$5.00 / 5）")), "data");
});

test("設定缺漏分類為 data", () => {
  assert.equal(classifyError(new Error("Missing OPENAI_API_KEY environment variable")), "data");
  assert.equal(classifyError(new Error("找不到這位 Agent")), "data");
});

test("分不出來的歸為 unknown，不會被誤判成可重試", () => {
  assert.equal(classifyError(new Error("某個沒見過的狀況")), "unknown");
  assert.equal(classifyError("連 Error 都不是的東西"), "unknown");
});
