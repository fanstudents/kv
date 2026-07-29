import "server-only";

// 所有對外 HTTP 呼叫的共同入口。
//
// 在這之前，openai.ts / line.ts / google.ts 的 fetch 沒有逾時也沒有重試：
// 對方一次 429 或連線卡住，那則客戶留言就永遠消失了，而且函式會一直掛到平台把它砍掉。
// 這裡處理三件事：
//   逾時   —— 沒有 AbortSignal 的 fetch 可以永遠等下去
//   重試   —— 只重試「等一下可能就好了」的錯誤（429／5xx／網路層），4xx 重試一百次還是一樣
//   退避   —— 指數退避 + 抖動，並優先聽對方的 Retry-After；對方限流時密集重試只會更糟

export interface HttpOptions {
  /** 單次嘗試的逾時（毫秒），預設 30 秒 */
  timeoutMs?: number;
  /** 失敗後最多再試幾次，預設 2（總共最多 3 次） */
  retries?: number;
  /** 出現在 log 裡的名字，方便追是哪個外部服務在鬧 */
  label?: string;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;
const BASE_BACKOFF_MS = 500;
/** 這些狀態碼代表「現在不行，等一下可能可以」 */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export class HttpError extends Error {
  readonly status: number;
  readonly body: string;

  // 刻意不用 constructor 參數屬性（readonly status: number 那種寫法）：
  // Node 內建的型別剝除不支援它，這個檔案就沒辦法被 node --test 直接載入。
  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

/** 退避時間：指數成長 + 抖動，避免多個請求同時醒來又一起打死對方 */
export function backoffMs(attempt: number, retryAfterSeconds?: number): number {
  if (retryAfterSeconds && retryAfterSeconds > 0) return Math.min(retryAfterSeconds * 1000, 30_000);
  const exponential = BASE_BACKOFF_MS * 2 ** attempt;
  return Math.min(exponential + Math.random() * BASE_BACKOFF_MS, 10_000);
}

function retryAfterSeconds(res: Response): number | undefined {
  const raw = res.headers.get("retry-after");
  if (!raw) return undefined;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber)) return asNumber;
  const asDate = Date.parse(raw);
  return Number.isFinite(asDate) ? Math.max(0, (asDate - Date.now()) / 1000) : undefined;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 帶逾時與重試的 fetch。
 *
 * 回傳的 Response 可能仍是失敗狀態（4xx）——這裡只負責「值得重試的」自動重試，
 * 呼叫端該怎麼解讀狀態碼還是呼叫端決定。重試耗盡後最後一次的 Response 會直接回傳。
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: HttpOptions = {}
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const label = opts.label ?? new URL(url).host;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });

      if (!RETRYABLE_STATUS.has(res.status) || attempt === retries) return res;

      const wait = backoffMs(attempt, retryAfterSeconds(res));
      console.warn(`[http] ${label} 回應 ${res.status}，${Math.round(wait)}ms 後重試（第 ${attempt + 1} 次）`);
      await sleep(wait);
      continue;
    } catch (err) {
      lastError = err;
      // AbortSignal.timeout 觸發時是 TimeoutError；網路層失敗是 TypeError。兩者都值得再試。
      if (attempt === retries) break;
      const wait = backoffMs(attempt);
      const reason = err instanceof Error ? err.name : "unknown";
      console.warn(`[http] ${label} 呼叫失敗（${reason}），${Math.round(wait)}ms 後重試（第 ${attempt + 1} 次）`);
      await sleep(wait);
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${label} 呼叫失敗（已重試 ${retries} 次）：${reason}`);
}

/** 把非 2xx 的回應轉成帶狀態碼的例外，讓 classifyError 分得出是外部問題還是資料問題 */
export async function assertOk(res: Response, label: string): Promise<Response> {
  if (res.ok) return res;
  const body = await res.text().catch(() => "");
  throw new HttpError(`${label} 回應 ${res.status}：${body.slice(0, 500)}`, res.status, body);
}
