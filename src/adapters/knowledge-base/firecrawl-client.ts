import "server-only";

const API_BASE = process.env.FIRECRAWL_API_BASE ?? "https://api.firecrawl.dev/v2";

function apiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("尚未設定 FIRECRAWL_API_KEY，無法從網址匯入");
  return key;
}

/** 額度／限流用完時丟這個，上層可以據此給使用者看得懂的說明而不是 HTTP 代碼。 */
export class FirecrawlQuotaError extends Error {
  constructor(
    message: string,
    readonly kind: "credits" | "rate-limit" | "auth"
  ) {
    super(message);
    this.name = "FirecrawlQuotaError";
  }
}

async function requestFirecrawl<T>(
  path: string,
  body?: Record<string, unknown>,
  method: "GET" | "POST" = "POST",
  retry = true
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
  const data = await response.json().catch(() => ({}));

  if (response.ok) return data as T;

  if (response.status === 402) {
    throw new FirecrawlQuotaError(
      "Firecrawl 本期額度已用完，無法再抓取網頁。可以等下一個計費週期，或到 Firecrawl 後台加值；PDF 匯入不受影響。",
      "credits"
    );
  }
  if (response.status === 429) {
    const wait = Number(response.headers.get("retry-after")) || 8;
    if (retry) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(wait, 20) * 1000));
      return requestFirecrawl<T>(path, body, method, false);
    }
    throw new FirecrawlQuotaError("Firecrawl 請求太密集（同時最多 2 個任務），請稍後再試一次。", "rate-limit");
  }
  if (response.status === 401 || response.status === 403) {
    throw new FirecrawlQuotaError("Firecrawl API key 無效或已被撤銷，請更新 FIRECRAWL_API_KEY。", "auth");
  }

  const detail = typeof data?.error === "string" ? data.error : `HTTP ${response.status}`;
  throw new Error(`Firecrawl 失敗：${detail}`);
}

export interface CreditUsage {
  remaining: number;
  plan: number;
  periodEnd: string | null;
}

export interface CrawledPage {
  url: string;
  title: string;
  markdown: string;
}

/** 查目前剩餘額度；狀態查不到時維持既有 null fallback。 */
export async function getCreditUsage(): Promise<CreditUsage | null> {
  try {
    const data = await requestFirecrawl<{
      data?: { remainingCredits?: number; planCredits?: number; billingPeriodEnd?: string };
    }>("/team/credit-usage", undefined, "GET");
    return {
      remaining: Number(data.data?.remainingCredits ?? 0),
      plan: Number(data.data?.planCredits ?? 0),
      periodEnd: data.data?.billingPeriodEnd ?? null,
    };
  } catch {
    return null;
  }
}

export async function scrapeUrl(url: string): Promise<CrawledPage> {
  const data = await requestFirecrawl<{
    data?: { markdown?: string; metadata?: { title?: string; sourceURL?: string } };
  }>("/scrape", { url, formats: ["markdown"], onlyMainContent: true });
  return {
    url: data.data?.metadata?.sourceURL ?? url,
    title: data.data?.metadata?.title ?? url,
    markdown: data.data?.markdown ?? "",
  };
}

export async function mapSite(url: string, limit = 100): Promise<{ url: string; title?: string }[]> {
  const data = await requestFirecrawl<{ links?: { url: string; title?: string }[] }>("/map", { url, limit });
  return data.links ?? [];
}

export async function crawlSite(url: string, limit = 25): Promise<CrawledPage[]> {
  const credit = await getCreditUsage();
  if (credit && credit.remaining < limit) {
    throw new FirecrawlQuotaError(
      `Firecrawl 剩餘額度 ${credit.remaining}，不足以抓 ${limit} 頁。請調低頁數上限，或等下一個計費週期。`,
      "credits"
    );
  }

  const start = await requestFirecrawl<{ id?: string }>("/crawl", {
    url,
    limit,
    scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
  });
  if (!start.id) throw new Error("Firecrawl 沒有回傳任務編號");

  const deadline = Date.now() + 200_000;
  let pages: CrawledPage[] = [];
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const status = await requestFirecrawl<{
      status?: string;
      data?: { markdown?: string; metadata?: { title?: string; sourceURL?: string } }[];
    }>(`/crawl/${start.id}`, undefined, "GET");

    pages = (status.data ?? []).map((page) => ({
      url: page.metadata?.sourceURL ?? url,
      title: page.metadata?.title ?? "",
      markdown: page.markdown ?? "",
    }));
    if (status.status === "completed") break;
  }
  return pages.filter((page) => page.markdown.trim().length > 0);
}
