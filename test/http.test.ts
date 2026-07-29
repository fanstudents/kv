import { test } from "node:test";
import assert from "node:assert/strict";
import { backoffMs } from "@/lib/http";

// 退避演算法的性質測試。
// 這段程式碼平常只有在對方 429／5xx 的時候才會執行——正是最不容易被人工測到、
// 而寫錯代價最大的地方（退避太短會把對方打得更死，太長會讓重試永遠等不到）。

test("退避時間隨著次數指數成長", () => {
  const first = backoffMs(0);
  const second = backoffMs(1);
  const third = backoffMs(2);

  // 有抖動，所以比的是區間而不是固定值
  assert.ok(first >= 500 && first <= 1000, `第一次應在 500～1000ms，實際 ${first}`);
  assert.ok(second >= 1000 && second <= 1500, `第二次應在 1000～1500ms，實際 ${second}`);
  assert.ok(third >= 2000 && third <= 2500, `第三次應在 2000～2500ms，實際 ${third}`);
});

test("退避時間有上限，不會無限成長", () => {
  assert.ok(backoffMs(20) <= 10_000, "指數成長必須被夾在 10 秒以內");
});

test("對方給了 Retry-After 就聽對方的", () => {
  assert.equal(backoffMs(0, 3), 3000);
  assert.equal(backoffMs(5, 7), 7000);
});

test("Retry-After 過長時仍然夾到 30 秒", () => {
  assert.equal(backoffMs(0, 3600), 30_000);
});

test("Retry-After 為 0 或負數時退回指數退避", () => {
  const zero = backoffMs(0, 0);
  assert.ok(zero >= 500 && zero <= 1000, `應退回指數退避，實際 ${zero}`);
});
