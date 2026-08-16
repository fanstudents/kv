import "server-only";

import { createChatCompletion, requestWebSearchJson } from "@/adapters/openai/client";
import { scrapeUrl } from "@/adapters/knowledge-base/firecrawl-client";
import type {
  VisitContactProfile,
  VisitProfileLink,
  VisitResearchInput,
  VisitResearchProvider,
} from "@/modules/visit/research";

const SYSTEM_PROMPT = `你是業務行前準備助理。使用者要去拜訪一位客戶，請你用網路搜尋整理這個人與這家公司的公開背景資料。

嚴格規則：
1. 只用你實際搜尋到的公開資訊。**查不到就留空或空陣列，絕對不要推測、不要用常見情況填滿。**
2. 每一則說法都要對得上你引用的來源網址；沒有來源的內容不要寫。
   **sources 與 links 裡一律填完整網址（https:// 開頭），不要只寫網站名稱或文章標題。**
3. 只找公開的專業資訊：公司官網、新聞報導、公開演講、專業社群帳號（LinkedIn／官方 Facebook／IG 等）、
   得獎或作品。**不要找私人生活、家庭、住址、私人聯絡方式。**
4. 如果搜尋結果裡有同名不同人的情況，寧可保守——把不確定的排除，並把 confidence 調低。
5. 近期動態優先找最近 7 天；沒有可靠的新資料就保留較舊但可驗證的內容。不要輸出資本額。

回傳 JSON：
{
  "companySummary": "這家公司在做什麼、規模、近況（2-3 句；查不到就空字串）",
  "personSummary": "這個人的角色與專業背景（2-3 句；查不到就空字串）",
  "links": [{"label": "公司官網", "url": "https://...", "kind": "website|linkedin|facebook|instagram|news|other"}],
  "highlights": ["近期值得一提的事，每則一句，附帶時間點"],
  "talkingPoints": ["見面時可以聊的切入點，每則一句，要根據上面查到的事實"],
  "sources": ["https://實際引用到的完整網址"],
  "confidence": 0.0
}`;

const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.com.tw",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "me.com",
  "msn.com",
  "qq.com",
  "163.com",
  "126.com",
  "live.com",
  "aol.com",
]);

function officialSiteUrl(profile: VisitContactProfile, email: string | null): string | null {
  const site = profile.links.find((link) => link.kind === "website" && /^https?:\/\//.test(link.url));
  if (site) return site.url;
  const domain = email?.split("@")[1]?.trim().toLowerCase();
  if (!domain || !domain.includes(".") || PUBLIC_EMAIL_DOMAINS.has(domain)) return null;
  return `https://${domain}`;
}

function normalizeProfile(raw: Record<string, unknown>): VisitContactProfile {
  return {
    companySummary: String(raw.companySummary ?? "").trim(),
    personSummary: String(raw.personSummary ?? "").trim(),
    links: Array.isArray(raw.links)
      ? raw.links
          .filter((link: unknown) => Boolean(link) && typeof link === "object")
          .map((link: Record<string, unknown>) => ({
            label: String(link.label ?? "連結"),
            url: String(link.url ?? ""),
            kind: link.kind ? String(link.kind) : undefined,
          }))
          .filter((link: VisitProfileLink) => /^https?:\/\//.test(link.url))
      : [],
    highlights: Array.isArray(raw.highlights)
      ? raw.highlights.map(String).filter(Boolean).slice(0, 8)
      : [],
    talkingPoints: Array.isArray(raw.talkingPoints)
      ? raw.talkingPoints.map(String).filter(Boolean).slice(0, 6)
      : [],
    sources: Array.isArray(raw.sources)
      ? raw.sources
          .map(String)
          .filter((url: string) => /^https?:\/\//.test(url))
          .slice(0, 12)
      : [],
    confidence: Math.min(1, Math.max(0, Number(raw.confidence) || 0.4)),
  };
}

export const openAiVisitResearchProvider: VisitResearchProvider = {
  buildSearchInput(input: VisitResearchInput) {
    return [
      `拜訪對象：${input.name}`,
      input.title ? `職稱：${input.title}` : "",
      input.company ? `公司：${input.company}` : "",
      input.email ? `Email 網域：${input.email.split("@")[1] ?? ""}` : "",
      "",
      "請搜尋這家公司與這個人的公開資料，整理成見面前的行前功課。",
    ]
      .filter(Boolean)
      .join("\n");
  },

  async search(searchInput: string) {
    const raw = await requestWebSearchJson(
      {
        instructions: SYSTEM_PROMPT,
        input: searchInput,
        model: "gpt-4o",
      },
      { operation: "拜訪前背景調查", agentSlug: "visit" }
    );
    return normalizeProfile(raw);
  },

  async enrichCompanyProfile(input, profile) {
    const siteUrl = officialSiteUrl(profile, input.email);
    if (!siteUrl) return profile;

    const page = await scrapeUrl(siteUrl);
    if (!page.markdown.trim()) return profile;

    const response = await createChatCompletion(
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "根據公司官網正文，用 2 到 3 句繁體中文摘要公司業務、規模或近期重點。" +
              "看不出來就回空字串，不要猜測，也不要輸出資本額。只回傳 JSON：{\"summary\":\"...\"}",
          },
          { role: "user", content: page.markdown.slice(0, 6000) },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      },
      { operation: "官網簡介摘要", agentSlug: "visit" },
    );
    let summary = "";
    try {
      summary = String(JSON.parse(response.choices[0]?.message.content ?? "{}").summary ?? "").trim();
    } catch {
      return profile;
    }
    if (!summary) return profile;

    return {
      ...profile,
      companySummary: summary,
      sources: profile.sources.includes(page.url) ? profile.sources : [...profile.sources, page.url],
      links: profile.links.some((link) => link.url === page.url)
        ? profile.links
        : [...profile.links, { label: "公司官網", url: page.url, kind: "website" }],
    };
  },
};
