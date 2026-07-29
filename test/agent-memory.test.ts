import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryContext, type MemoryRow } from "@/lib/agent-memory";

// 記憶會被直接接進 prompt。格式跑掉的話不會有錯誤訊息，
// 只會讓 Agent 開始講一些沒人講過的話——這種故障最難從症狀反推原因。

function row(over: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: "1",
    scope: "agent",
    agent_slug: "support",
    kind: "episodic",
    content: "昨天有 3 位客戶進線",
    level: 2,
    confidence: 0.6,
    created_at: "2026-07-29T00:00:00Z",
    expires_at: null,
    ...over,
  };
}

test("沒有記憶時回空字串，不會塞一段空標題進 prompt", () => {
  assert.equal(memoryContext([]), "");
});

test("三種記憶各自標上中文標籤", () => {
  const text = memoryContext([
    row({ id: "1", kind: "episodic", content: "做過這件事" }),
    row({ id: "2", kind: "semantic", content: "學到這件事" }),
    row({ id: "3", kind: "preference", content: "對方習慣這樣" }),
  ]);

  assert.match(text, /做過｜/);
  assert.match(text, /學到｜/);
  assert.match(text, /偏好｜/);
});

test("每條記憶都帶敏感度分級標籤——Agent 才知道哪些話不能往外講", () => {
  const text = memoryContext([row({ level: 4, content: "某個機密" })]);
  const lines = text.split("\n").filter((l) => l.startsWith("- "));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /\[.+｜.+\] 某個機密/);
});

test("順序原樣保留（呼叫端已經排好，越前面越新）", () => {
  const text = memoryContext([row({ id: "1", content: "較新" }), row({ id: "2", content: "較舊" })]);
  assert.ok(text.indexOf("較新") < text.indexOf("較舊"));
});
