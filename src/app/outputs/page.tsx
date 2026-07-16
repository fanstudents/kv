"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import Avatar from "@/components/agents/Avatar";
import { AGENTS } from "@/lib/agent-data";

interface ActivityRow {
  id: string;
  agent_slug: string | null;
  occurred_at: string;
  summary: string;
  status: "success" | "failed" | "pending";
}

interface VisitOfferRow {
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

interface PendingInviteRow {
  status: "pending" | "confirmed" | "cancelled" | "sent" | "failed";
  slot1: string;
  slot2: string;
  chosen_slot: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface ContactRow {
  id: string;
  name: string;
  company: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  created_at: string;
  visit_offers: VisitOfferRow[];
  pending_invites: PendingInviteRow[];
}

function latestByCreatedAt<T extends { created_at: string }>(rows: T[]): T | undefined {
  return [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

function deriveVisitStatus(contact: ContactRow): { label: string; tone: "neutral" | "success" | "danger" | "warning" } {
  const invite = latestByCreatedAt(contact.pending_invites ?? []);
  const offer = latestByCreatedAt(contact.visit_offers ?? []);

  if (invite) {
    if (invite.status === "confirmed") {
      const chosenLabel = invite.chosen_slot === "2" ? invite.slot2 : invite.slot1;
      return { label: `已確認：${chosenLabel}`, tone: "success" };
    }
    if (invite.status === "pending") return { label: "邀約信已寄出，等待對方選擇", tone: "warning" };
    if (invite.status === "failed") return { label: "自動排程失敗，需人工跟進", tone: "danger" };
    if (invite.status === "cancelled") return { label: "邀約已取消", tone: "neutral" };
  }

  if (offer) {
    if (offer.status === "pending") return { label: "已詢問是否安排拜訪，等待回覆", tone: "warning" };
    if (offer.status === "accepted") return { label: "已同意，準備寄出邀約信", tone: "warning" };
    if (offer.status === "declined") return { label: "已婉拒安排拜訪", tone: "neutral" };
  }

  if (!contact.email) return { label: "缺少 Email，無法安排", tone: "neutral" };
  return { label: "尚未詢問", tone: "neutral" };
}

export default function OutputsPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/activity?status=success&limit=500")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ActivityRow[]) => setRows(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoaded(true));

    fetch("/api/contacts")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ContactRow[]) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setContactsLoaded(true));
  }, []);

  const table = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return AGENTS.map((agent) => {
      const agentRows = rows
        .filter((r) => r.agent_slug === agent.slug)
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
      const recent = agentRows.filter((r) => new Date(r.occurred_at).getTime() >= cutoff);
      return {
        agent,
        total: agentRows.length,
        recent: recent.length,
        latest: agentRows[0],
      };
    });
  }, [rows]);

  const totalOutputs = table.reduce((sum, t) => sum + t.total, 0);
  const mostActive = [...table].sort((a, b) => b.total - a.total)[0];

  return (
    <div>
      <PageHeader title="產出總覽" description="一張表看到每位 Agent 實際完成了哪些工作" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-neutral-400">全隊累計產出</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
            {loaded ? totalOutputs : "…"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">最活躍隊友</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
            {loaded && mostActive && mostActive.total > 0
              ? `${mostActive.agent.personEn} ${mostActive.agent.personZh}`
              : "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">近 30 天總產出</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
            {loaded ? table.reduce((sum, t) => sum + t.recent, 0) : "…"}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Agent</th>
                <th className="px-4 py-3 text-left font-medium">狀態</th>
                <th className="px-4 py-3 text-right font-medium">累計產出</th>
                <th className="px-4 py-3 text-right font-medium">近 30 天</th>
                <th className="px-4 py-3 text-left font-medium">最新產出內容</th>
                <th className="px-4 py-3 text-left font-medium">時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {table.map(({ agent, total, recent, latest }) => (
                <tr key={agent.slug} className="hover:bg-neutral-50 dark:hover:bg-neutral-950/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar personEn={agent.personEn} color={agent.color} size={30} />
                      <div>
                        <p className="font-medium text-neutral-800 dark:text-neutral-100">
                          {agent.personEn} {agent.personZh}
                        </p>
                        <p className="text-xs text-neutral-400">{agent.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={agent.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-800 dark:text-neutral-100">
                    {loaded ? total : "…"}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-500 dark:text-neutral-400">
                    {loaded ? recent : "…"}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-neutral-600 dark:text-neutral-300">
                    {latest ? (
                      <span className="line-clamp-1">{latest.summary}</span>
                    ) : (
                      <span className="text-neutral-400">尚無產出紀錄</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-400">
                    {latest ? new Date(latest.occurred_at).toLocaleString("zh-TW") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-8 mb-4">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">名片聯絡人</h2>
        <p className="mt-1 text-xs text-neutral-400">
          透過 LINE 傳送名片辨識後建立的聯絡人，以及目前的邀約進度
        </p>
      </div>

      <Card className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">聯絡人</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">電話</th>
                <th className="px-4 py-3 text-left font-medium">建立時間</th>
                <th className="px-4 py-3 text-left font-medium">邀約狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {contactsLoaded && contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                    尚未有透過 LINE 辨識的名片聯絡人
                  </td>
                </tr>
              )}
              {contacts.map((contact) => {
                const { label, tone } = deriveVisitStatus(contact);
                return (
                  <tr key={contact.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-950/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-800 dark:text-neutral-100">{contact.name}</p>
                      <p className="text-xs text-neutral-400">
                        {[contact.title, contact.company].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{contact.email || "—"}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{contact.phone || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-400">
                      {new Date(contact.created_at).toLocaleString("zh-TW")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={tone}>{label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
