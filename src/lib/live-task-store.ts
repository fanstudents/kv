import "server-only";

// 劇院模式「真實現正處理」的即時狀態。
// 存在單一 Node 程序的記憶體裡：webhook 寫入、/tv 讀取（同一 Zeabur 容器共用）。
// 這是 demo 取向——重啟即清空、僅單一實例有效；要多實例可換 Supabase/Redis。

export interface LiveTaskState {
  agentSlug: string;
  /** 目前進行到第幾個階段（= 已完成階段數；等於階段總數時代表全部完成） */
  step: number;
  status: "active" | "done";
  caption?: string;
  /** 名片等實際圖片（data URL），只保留最新一張 */
  image?: string;
  /** 圖片版本（換圖才變，供前端 <img> 快取失效） */
  imageVersion: number;
  updatedAt: number;
}

const store = new Map<string, LiveTaskState>();
const TTL_MS = 120_000; // 兩分鐘沒更新就視為結束，畫面回到示意動畫

type Patch = Partial<Pick<LiveTaskState, "step" | "status" | "caption" | "image">>;

export function setLiveTask(agentSlug: string, patch: Patch) {
  const prev = store.get(agentSlug);
  const imageChanged = patch.image !== undefined && patch.image !== prev?.image;
  store.set(agentSlug, {
    agentSlug,
    step: patch.step ?? prev?.step ?? 0,
    status: patch.status ?? prev?.status ?? "active",
    caption: patch.caption ?? prev?.caption,
    image: patch.image ?? prev?.image,
    imageVersion: imageChanged ? Date.now() : (prev?.imageVersion ?? 0),
    updatedAt: Date.now(),
  });
}

export function getLiveTask(agentSlug: string): LiveTaskState | null {
  const t = store.get(agentSlug);
  if (!t) return null;
  if (Date.now() - t.updatedAt > TTL_MS) {
    store.delete(agentSlug);
    return null;
  }
  return t;
}
