import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

// 「目前正在跑哪一次執行」的隱式上下文。
//
// 沒有這層的話，每一個會花錢的函式都得多帶一個 runId 參數，一路從 route 傳到 openai.ts——
// 傳漏一個地方，那筆成本就變成孤兒，`這份報表花了多少錢` 又答不出來了。
// AsyncLocalStorage 讓 logAiUsage() 自己去問「我現在在哪一次執行裡」，
// 呼叫端不需要知道這件事存在。
//
// 用法一律透過 agent-runs.ts 的 tracked()，不要直接呼叫 withRun()。

export interface RunContext {
  runId: string;
  agentSlug: string;
}

const storage = new AsyncLocalStorage<RunContext>();

export function withRun<T>(ctx: RunContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

export function currentRun(): RunContext | undefined {
  return storage.getStore();
}

export function currentRunId(): string | null {
  return storage.getStore()?.runId ?? null;
}

export function currentAgentSlug(): string | null {
  return storage.getStore()?.agentSlug ?? null;
}
