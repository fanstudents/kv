import "server-only";
import { getSupabase } from "@/lib/supabase";
import { webSearchJson, chatJson } from "@/lib/openai";
import { scrapeUrl } from "@/lib/kb-crawl";
import { finishRun, logStep, startRun } from "@/lib/agent-runs";
import { setLiveTask } from "@/lib/live-task-store";
import { fetchWithRetry } from "@/lib/http";

/**
 * 直接 fetch 網頁原始碼抓 og:image，不動用 Firecrawl 額度——網路搜尋已經查到公司簡介、
 * 不需要再花錢抓正文的情況，仍然想「順手」拿張代表圖時用這個，抓不到就算了。
 */
async function fetchOgImage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetchWithRetry(pageUrl, {}, { label: "og:image 頁面", timeoutMs: 8_000, retries: 0 });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return null;
    const html = await res.text();
    const match =
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html) ??
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html);
    if (!match) return null;
    return new URL(match[1], pageUrl).toString();
  } catch {
    return null;
  }
}

/** 把公開圖片（官網 og:image）下載成 data URL，供劇院模式直接顯示；抓不到就回 null，不影響其他資料。 */
async function downloadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetchWithRetry(url, {}, { label: "og:image", timeoutMs: 15_000, retries: 0 });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    // 太大的圖（例如整頁截圖誤標成 og:image）不值得塞進去，寧可沒有圖，改顯示文字摘要
    if (buffer.length > 3 * 1024 * 1024) return null;
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

// webSearchJson 常常只拿到片段摘要，查不到公司在做什麼的情況不少見。與其每次都
// 另外燒 Firecrawl 額度抓官網正文，只在「網路搜尋真的查不到公司簡介，而且手上有
// 明確的官網網址」這個子集才補一次——網址優先用搜尋結果自己找到的官網連結，
// 找不到才退而求其次用 email 網域猜（排除常見的免費信箱，猜了也是猜到信箱商）。
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

/** 劇院卡片用的摘要文字：公司＋個人簡介，有查到近況再加一則當子標題。 */
function buildTheaterSummary(profile: ContactProfile): string {
  const parts = [profile.companySummary, profile.personSummary].filter(Boolean);
  if (profile.highlights[0]) parts.push(`近況：${profile.highlights[0]}`);
  return parts.join("\n") || "沒查到公開資料";
}

function pickOfficialSiteUrl(links: ProfileLink[], email?: string | null): string | null {
  const siteLink = links.find((l) => l.kind === "website" && l.url);
  if (siteLink) return siteLink.url;
  const domain = email?.split("@")[1]?.toLowerCase().trim();
  if (domain && !PUBLIC_EMAIL_DOMAINS.has(domain)) return `https://${domain}`;
  return null;
}

// 約拜訪成交後的「行前功課」：對方一確認時段，Coco 就去網路上查這個人與這家公司——
// 官網、新聞、LinkedIn／社群、近期成果——整理成一頁見面前可以先看的背景資料，
// 存進 contact_profiles。
//
// 幾個刻意的邊界：
// 1. **只查公開資訊**，而且只在「對方已經答應見面」之後才查——不是名片一進來就全網搜刮。
// 2. 每一條都要帶來源網址；查不到就寫查不到，不要用推測補滿（prompt 裡講得很死）。
// 3. 整份資料標成 L3（客戶資料等級），不是誰都讀得到。
// 4. 走 agent_runs 記錄：這是第一個真的用上執行核心資料表的流程，
//    每次調查都是一次可追溯的 run（花了多少 token、成功還失敗）。

export interface ProfileLink {
  label: string;
  url: string;
  kind?: string;
}

export interface ContactProfile {
  companySummary: string;
  personSummary: string;
  links: ProfileLink[];
  highlights: string[];
  talkingPoints: string[];
  sources: string[];
  confidence: number;
}

const SYSTEM_PROMPT = `你是業務行前準備助理。使用者要去拜訪一位客戶，請你用網路搜尋整理這個人與這家公司的公開背景資料。

嚴格規則：
1. 只用你實際搜尋到的公開資訊。**查不到就留空或空陣列，絕對不要推測、不要用常見情況填滿。**
2. 每一則說法都要對得上你引用的來源網址；沒有來源的內容不要寫。
   **sources 與 links 裡一律填完整網址（https:// 開頭），不要只寫網站名稱或文章標題。**
3. 只找公開的專業資訊：公司官網、新聞報導、公開演講、專業社群帳號（LinkedIn／官方 Facebook／IG 等）、
   得獎或作品。**不要找私人生活、家庭、住址、私人聯絡方式。**
4. 如果搜尋結果裡有同名不同人的情況，寧可保守——把不確定的排除，並把 confidence 調低。
5. highlights 優先找**最近 7 天內**的專業動態（社群貼文、新聞、產品或活動消息）；沒有近 7 天的才退而
   求其次抓比較舊但仍值得一提的事，並在該則文字裡註明大概時間點，讓使用者知道這不是最新消息。
6. **不要輸出公司登記資本額、統一編號這類工商登記數字**——見面前功課要的是「這家公司在做什麼」，
   不是報表數字。

回傳 JSON：
{
  "companySummary": "這家公司在做什麼、規模、近況（2-3 句；查不到就空字串；不要放資本額等登記數字）",
  "personSummary": "這個人的角色與專業背景（2-3 句；查不到就空字串）",
  "links": [{"label": "公司官網", "url": "https://...", "kind": "website|linkedin|facebook|instagram|news|other"}],
  "highlights": ["近期值得一提的事，每則一句，附帶時間點，優先近 7 天內的"],
  "talkingPoints": ["見面時可以聊的切入點，每則一句，要根據上面查到的事實"],
  "sources": ["https://實際引用到的完整網址"],
  "confidence": 0.0
}`;

/** 對一位聯絡人做背景調查並寫進資料庫。best-effort：失敗就記錄失敗，不影響已成立的約會。 */
export async function researchContact(params: {
  contactId?: string | null;
  inviteId?: string | null;
  name: string;
  company?: string | null;
  title?: string | null;
  email?: string | null;
}): Promise<string | null> {
  const supabase = getSupabase();
  // 同一位聯絡人 30 天內查過就不重查（省錢，也避免重複打擾搜尋 API）
  if (params.contactId) {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: recent } = await supabase
      .from("contact_profiles")
      .select("id")
      .eq("contact_id", params.contactId)
      .eq("status", "done")
      .gte("created_at", since)
      .maybeSingle();
    if (recent?.id) return recent.id as string;
  }

  const runId = await startRun({
    agentSlug: "visit",
    trigger: "agent",
    triggerRef: params.inviteId ? `research:${params.inviteId}` : undefined,
    summary: `拜訪前背景調查：${params.name}`,
    meta: { contactId: params.contactId ?? null, company: params.company ?? null },
  });

  const query = [
    `拜訪對象：${params.name}`,
    params.title ? `職稱：${params.title}` : "",
    params.company ? `公司：${params.company}` : "",
    params.email ? `Email 網域：${params.email.split("@")[1] ?? ""}` : "",
    "",
    "請搜尋這家公司與這個人的公開資料，整理成見面前的行前功課。",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    // node id 直接對到流程圖上的節點（src/lib/agent-briefings.ts 的 visit.flow），
    // 劇院模式看板就是靠這組 id 對照亮起哪個節點、秀哪段文字。
    // 摘要文字一律透過 logStep 的 output 帶（不要另外呼叫 setLiveTask 寫 caption）：
    // agent_live_task 是每個 Agent 共用一列，若同時有名片掃描在跑，caption 跟 nodeId
    // 會分別來自兩個不同流程、對不上——劇院畫面就會出現「亮著這個節點、卻顯示另一段文字」
    // 的詭異狀態。output 跟 nodeId 綁在同一列 agent_run_steps，才不會兜錯。
    await logStep(runId, "research", {
      status: "running",
      input: query.slice(0, 200),
      output: `查 ${params.name} 的背景資料…`,
      seq: 0,
    });
    const raw = await webSearchJson({
      instructions: SYSTEM_PROMPT,
      input: query,
      operation: "拜訪前背景調查",
      agentSlug: "visit",
    });

    const profile: ContactProfile = {
      companySummary: String(raw?.companySummary ?? "").trim(),
      personSummary: String(raw?.personSummary ?? "").trim(),
      links: Array.isArray(raw?.links)
        ? raw.links
            .filter((l: unknown) => Boolean(l) && typeof l === "object")
            .map((l: Record<string, unknown>) => ({
              label: String(l.label ?? "連結"),
              url: String(l.url ?? ""),
              kind: l.kind ? String(l.kind) : undefined,
            }))
            .filter((l: ProfileLink) => /^https?:\/\//.test(l.url))
        : [],
      highlights: Array.isArray(raw?.highlights) ? raw.highlights.map(String).filter(Boolean).slice(0, 8) : [],
      talkingPoints: Array.isArray(raw?.talkingPoints)
        ? raw.talkingPoints.map(String).filter(Boolean).slice(0, 6)
        : [],
      sources: Array.isArray(raw?.sources)
        ? raw.sources.map(String).filter((u: string) => /^https?:\/\//.test(u)).slice(0, 12)
        : [],
      confidence: Math.min(1, Math.max(0, Number(raw?.confidence) || 0.4)),
    };

    // 網路搜尋沒查到公司在做什麼 → 只在這個子集才補一次 Firecrawl 抓官網正文。
    // 額度用完、抓取失敗都當作沒有這份加強資料，不影響已經拿到的 web_search 結果。
    const siteUrl = !profile.companySummary && params.company ? pickOfficialSiteUrl(profile.links, params.email) : null;

    if (siteUrl) {
      try {
        await logStep(runId, "firecrawl", {
          status: "running",
          input: siteUrl,
          output: `官網查無簡介，補抓 ${siteUrl} 正文…`,
          seq: 1,
        });
        const page = await scrapeUrl(siteUrl);
        if (page.markdown.trim().length > 0) {
          const summarized = await chatJson({
            model: "gpt-4o-mini",
            operation: "官網簡介摘要",
            agentSlug: "visit",
            messages: [
              {
                role: "system",
                content:
                  "你會拿到一個公司官網的正文內容，請用 2-3 句繁體中文摘要這家公司在做什麼、規模或近況。" +
                  "只根據給你的內容判斷，看不出來就回空字串，不要用猜的填。不要輸出資本額、統一編號這類工商登記數字。" +
                  "只回傳 JSON：{\"summary\": \"...\"}",
              },
              { role: "user", content: page.markdown.slice(0, 6000) },
            ],
          });
          const summary = String(summarized?.summary ?? "").trim();
          if (summary) {
            profile.companySummary = summary;
            if (!profile.sources.includes(page.url)) profile.sources.push(page.url);
            if (!profile.links.some((l) => l.url === page.url)) {
              profile.links.push({ label: "公司官網", url: page.url, kind: "website" });
            }
          }
        }
        // 有 og:image 才顯示圖，劇院卡片才有東西可以放；沒有就靠下面的文字摘要撐版面。
        if (page.imageUrl) {
          const dataUrl = await downloadImageAsDataUrl(page.imageUrl);
          if (dataUrl) await setLiveTask("visit", { image: dataUrl });
        }
        await logStep(runId, "firecrawl", {
          status: "done",
          output: buildTheaterSummary(profile).slice(0, 600),
          seq: 1,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        await logStep(runId, "firecrawl", { status: "failed", output: message, seq: 1 }).catch(() => {});
      }
    } else {
      // 沒有走 Firecrawl 這條路——網路搜尋已經夠、或根本沒有可查的官網，直接收尾。
      // 順手（不花 Firecrawl 額度）試著抓官網 og:image，圖文一起顯示比較好看；抓不到就純文字。
      const websiteUrl = profile.links.find((l) => l.kind === "website")?.url;
      if (websiteUrl) {
        const ogImage = await fetchOgImage(websiteUrl);
        if (ogImage) {
          const dataUrl = await downloadImageAsDataUrl(ogImage);
          if (dataUrl) await setLiveTask("visit", { image: dataUrl });
        }
      }
      const summaryText = buildTheaterSummary(profile);
      await logStep(runId, "found", { status: "done", output: summaryText.slice(0, 600), seq: 1 });
    }

    const found =
      profile.companySummary.length > 0 ||
      profile.personSummary.length > 0 ||
      profile.links.length > 0 ||
      profile.highlights.length > 0;

    const { data, error } = await supabase
      .from("contact_profiles")
      .insert({
        contact_id: params.contactId ?? null,
        invite_id: params.inviteId ?? null,
        person_name: params.name,
        company: params.company ?? null,
        company_summary: profile.companySummary || null,
        person_summary: profile.personSummary || null,
        links: profile.links,
        highlights: profile.highlights,
        talking_points: profile.talkingPoints,
        sources: profile.sources,
        confidence: profile.confidence,
        status: found ? "done" : "empty",
        run_id: runId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await finishRun(runId, {
      status: "success",
      summary: found
        ? `已完成 ${params.name} 的行前背景調查`
        : `${params.name} 沒有查到可靠的公開資料`,
    });

    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: found
        ? `已完成拜訪前背景調查：${params.name}${params.company ? `（${params.company}）` : ""}——${profile.links.length} 個公開連結、${profile.highlights.length} 則近況`
        : `拜訪前背景調查：${params.name} 沒有查到可靠的公開資料`,
      status: found ? "success" : "pending",
    });

    return data.id as string;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    await finishRun(runId, { status: "failed", errorKind: "external", errorDetail: message });
    try {
      await supabase.from("contact_profiles").insert({
        contact_id: params.contactId ?? null,
        invite_id: params.inviteId ?? null,
        person_name: params.name,
        company: params.company ?? null,
        status: "failed",
        error_detail: message,
        run_id: runId,
      });
    } catch {
      /* 連失敗紀錄都寫不進去就算了，不要再往外丟 */
    }
    return null;
  }
}

export interface ContactProfileRow {
  id: string;
  person_name: string;
  company: string | null;
  company_summary: string | null;
  person_summary: string | null;
  links: ProfileLink[];
  highlights: string[];
  talking_points: string[];
  sources: string[];
  confidence: number;
  status: string;
  created_at: string;
}

export async function listContactProfiles(limit = 10): Promise<ContactProfileRow[]> {
  try {
    const { data } = await getSupabase()
      .from("contact_profiles")
      .select(
        "id,person_name,company,company_summary,person_summary,links,highlights,talking_points,sources,confidence,status,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as ContactProfileRow[];
  } catch {
    return [];
  }
}
