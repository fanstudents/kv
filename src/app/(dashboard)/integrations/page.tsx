"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field, TextInput, Select } from "@/components/ui/Field";
import Avatar from "@/components/agents/Avatar";
import BrandLogo from "@/components/integrations/BrandLogo";
import { AGENTS, getAgent } from "@/lib/agent-data";
import {
  INTEGRATION_CATEGORIES,
  INTEGRATION_SEEDS,
  INTEGRATIONS_STORAGE_KEY,
  type Integration,
} from "@/lib/integrations-data";
import type { AgentSlug } from "@/lib/types";

/* ── 單一服務卡片 ── */
function IntegrationCard({
  item,
  highlightAgent,
  onChange,
  onRemove,
}: {
  item: Integration;
  highlightAgent: AgentSlug | null;
  onChange: (next: Integration) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftLink, setDraftLink] = useState(item.link);
  const [draftAgent, setDraftAgent] = useState<AgentSlug>("teamlead");
  const [draftFeature, setDraftFeature] = useState("");

  const agentsUsing = [...new Set(item.uses.map((u) => u.agent))];

  const saveLink = () => {
    onChange({ ...item, link: draftLink.trim() });
    setEditing(false);
  };

  const addUse = () => {
    const feature = draftFeature.trim();
    if (!feature) return;
    onChange({ ...item, uses: [...item.uses, { agent: draftAgent, feature }] });
    setDraftFeature("");
  };

  const removeUse = (index: number) => {
    onChange({ ...item, uses: item.uses.filter((_, i) => i !== index) });
  };

  return (
    <Card className={highlightAgent && !agentsUsing.includes(highlightAgent) ? "opacity-40" : ""}>
      {/* 標頭：品牌標誌、名稱、狀態 */}
      <div className="flex items-start gap-3">
        <BrandLogo brand={item.icon} name={item.name} color={item.color} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">{item.name}</h2>
            <Badge tone={item.status === "connected" ? "success" : "warning"}>
              {item.status === "connected" ? "連線中" : "未連線"}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-neutral-400">
            {item.provider} · {item.category}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setDraftLink(item.link);
              setEditing((e) => !e);
            }}
            className={`rounded-md p-1.5 transition-colors ${
              editing
                ? "bg-[#06C755]/10 text-[#06C755]"
                : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
            }`}
            title={editing ? "結束編輯" : "編輯此服務"}
          >
            {editing ? <X size={15} /> : <Pencil size={15} />}
          </button>
        </div>
      </div>

      {/* 管理連結 */}
      <div className="mt-4">
        {editing ? (
          <div className="flex gap-2">
            <TextInput
              value={draftLink}
              onChange={(e) => setDraftLink(e.target.value)}
              placeholder="https://…"
              aria-label="管理連結"
            />
            <button
              type="button"
              onClick={saveLink}
              className="shrink-0 rounded-lg bg-[#06C755] px-3 text-sm font-medium text-white hover:opacity-90"
            >
              儲存
            </button>
          </div>
        ) : (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 transition-colors hover:border-[#06C755] hover:text-[#06C755] dark:border-neutral-700 dark:text-neutral-400"
          >
            <Link2 size={13} className="shrink-0" />
            <span className="truncate">{item.link.replace(/^https?:\/\//, "")}</span>
            <ExternalLink size={12} className="shrink-0" />
          </a>
        )}
        {item.note && <p className="mt-2 text-xs text-neutral-400">{item.note}</p>}
      </div>

      {/* 使用此服務的 Agent 與功能 */}
      <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-400">AGENT 使用中的功能</p>
        {item.uses.length === 0 && (
          <p className="text-xs text-neutral-400">尚未指派——點右上角鉛筆，把功能指派給 Agent。</p>
        )}
        <ul className="space-y-1.5">
          {item.uses.map((use, index) => {
            const agent = getAgent(use.agent);
            if (!agent) return null;
            const dimmed = highlightAgent !== null && use.agent !== highlightAgent;
            return (
              <li
                key={`${use.agent}-${index}`}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-opacity ${
                  dimmed ? "opacity-40" : ""
                } ${highlightAgent === use.agent ? "bg-[#06C755]/10" : ""}`}
              >
                <Link href={`/agents/${agent.slug}`} className="flex shrink-0 items-center gap-2" title={`前往${agent.name}`}>
                  <Avatar personEn={agent.personEn} color={agent.color} size={24} />
                  <span className="w-16 shrink-0 truncate text-xs font-medium text-neutral-600 dark:text-neutral-300">
                    {agent.shortName} {agent.personEn}
                  </span>
                </Link>
                <span className="min-w-0 flex-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {use.feature}
                </span>
                {editing && (
                  <button
                    type="button"
                    onClick={() => removeUse(index)}
                    className="shrink-0 rounded p-1 text-neutral-300 hover:text-red-500"
                    title="移除此功能"
                  >
                    <X size={13} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {/* 編輯模式：指派新功能、移除自訂服務 */}
        {editing && (
          <div className="mt-3 space-y-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950">
            <div className="flex gap-2">
              <Select
                value={draftAgent}
                onChange={(e) => setDraftAgent(e.target.value as AgentSlug)}
                aria-label="選擇 Agent"
                className="w-40 shrink-0"
              >
                {AGENTS.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.shortName} {a.personEn}
                  </option>
                ))}
              </Select>
              <TextInput
                value={draftFeature}
                onChange={(e) => setDraftFeature(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addUse();
                }}
                placeholder="這位 Agent 用此服務做什麼？"
              />
              <button
                type="button"
                onClick={addUse}
                className="shrink-0 rounded-lg border border-[#06C755] px-3 text-sm font-medium text-[#06C755] hover:bg-[#06C755]/10"
              >
                加入
              </button>
            </div>
            {!item.builtin && (
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10"
              >
                <Trash2 size={13} />
                移除這個服務
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── 頁面 ── */
export default function IntegrationsPage() {
  const [items, setItems] = useState<Integration[]>(INTEGRATION_SEEDS);
  const [loaded, setLoaded] = useState(false);
  const [filterAgent, setFilterAgent] = useState<AgentSlug | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<string>(INTEGRATION_CATEGORIES[0]);
  const [newLink, setNewLink] = useState("");

  // 異動存於瀏覽器 localStorage（介面示範，未接後端）；
  // 以微任務回呼載入，避免在 effect 內同步 setState 造成級聯渲染
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(INTEGRATIONS_STORAGE_KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch {
        /* 壞資料就回到種子 */
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* 私密模式等情況忽略 */
    }
  }, [items, loaded]);

  const agentsInUse = useMemo(() => {
    const slugs = new Set<AgentSlug>();
    for (const item of items) for (const use of item.uses) slugs.add(use.agent);
    return AGENTS.filter((a) => slugs.has(a.slug));
  }, [items]);

  const connectedCount = items.filter((i) => i.status === "connected").length;

  const updateItem = (next: Integration) =>
    setItems((prev) => prev.map((i) => (i.id === next.id ? next : i)));
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const addService = () => {
    const name = newName.trim();
    if (!name) return;
    setItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name,
        provider: "自訂",
        category: newCategory,
        link: newLink.trim() || "https://",
        status: "connected",
        icon: "custom",
        color: "#737373",
        uses: [],
      },
    ]);
    setNewName("");
    setNewLink("");
    setAdding(false);
  };

  const visibleItems = filterAgent
    ? items.filter((i) => i.uses.some((u) => u.agent === filterAgent))
    : items;

  return (
    <div>
      <PageHeader
        title="串接服務"
        description={`${connectedCount} 個服務連線中——每個服務的管理連結，以及哪位 Agent 用它做什麼，一頁看完`}
        actions={
          <>
            <Badge tone="neutral">異動儲存於此瀏覽器（示範）</Badge>
            <button
              type="button"
              onClick={() => setAdding((a) => !a)}
              className="flex items-center gap-1.5 rounded-lg bg-[#06C755] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {adding ? <X size={15} /> : <Plus size={15} />}
              {adding ? "取消" : "新增串接"}
            </button>
          </>
        }
      />

      {/* 新增串接 */}
      {adding && (
        <Card className="mb-6">
          <h2 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200">新增串接服務</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="服務名稱">
              <TextInput
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如：Slack"
                autoFocus
              />
            </Field>
            <Field label="分類">
              <Select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                {INTEGRATION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="管理連結" hint="服務的後台或主控台網址">
              <TextInput value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder="https://…" />
            </Field>
          </div>
          <button
            type="button"
            onClick={addService}
            disabled={!newName.trim()}
            className="mt-4 rounded-lg bg-[#06C755] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            建立服務
          </button>
        </Card>
      )}

      {/* 依 Agent 篩選：點一位隊友，立刻看到他用了哪些服務 */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterAgent(null)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            filterAgent === null
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
              : "border-neutral-200 text-neutral-500 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400"
          }`}
        >
          全部服務
        </button>
        {agentsInUse.map((agent) => (
          <button
            key={agent.slug}
            type="button"
            onClick={() => setFilterAgent((cur) => (cur === agent.slug ? null : agent.slug))}
            className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs font-medium transition-colors ${
              filterAgent === agent.slug
                ? "border-[#06C755] bg-[#06C755]/10 text-[#06C755]"
                : "border-neutral-200 text-neutral-500 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400"
            }`}
            title={`只看${agent.name}使用的服務`}
          >
            <Avatar personEn={agent.personEn} color={agent.color} size={22} />
            {agent.shortName} {agent.personEn}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {visibleItems.map((item) => (
          <IntegrationCard
            key={item.id}
            item={item}
            highlightAgent={filterAgent}
            onChange={updateItem}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </div>

      {visibleItems.length === 0 && (
        <Card className="text-center text-sm text-neutral-400">這位 Agent 目前沒有使用任何串接服務。</Card>
      )}
    </div>
  );
}
