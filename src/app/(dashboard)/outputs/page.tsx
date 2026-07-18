"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ScanLine,
  UserCheck,
  UserX,
  Mail,
  MessageSquareText,
  CalendarCheck,
  Clock,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import Avatar from "@/components/agents/Avatar";
import EmailMessage from "@/components/agents/EmailMessage";
import VisitFlowSteps, { type FlowStep } from "@/components/agents/VisitFlowSteps";
import { buildInviteEmailHtml } from "@/lib/email-templates";
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
  resolved_at: string | null;
}

interface PendingInviteRow {
  id: string;
  status: "pending" | "confirmed" | "cancelled" | "sent" | "failed";
  subject: string;
  body: string;
  slot1: string;
  slot2: string;
  chosen_slot: string | null;
  location: string | null;
  calendar_event_id: string | null;
  to_email: string;
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

function fmt(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function chosenLabelOf(invite: PendingInviteRow): string {
  return invite.chosen_slot === "2" ? invite.slot2 : invite.slot1;
}

function deriveVisitStatus(contact: ContactRow): { label: string; tone: "neutral" | "success" | "danger" | "warning" } {
  const invite = latestByCreatedAt(contact.pending_invites ?? []);
  const offer = latestByCreatedAt(contact.visit_offers ?? []);

  if (invite) {
    if (invite.status === "confirmed") {
      if (!invite.calendar_event_id) return { label: "客戶已選時段，等待地點", tone: "warning" };
      return { label: `已確認：${chosenLabelOf(invite)}`, tone: "success" };
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

function buildFlowSteps(contact: ContactRow): FlowStep[] {
  const offer = latestByCreatedAt(contact.visit_offers ?? []);
  const invite = latestByCreatedAt(contact.pending_invites ?? []);

  const steps: FlowStep[] = [];

  steps.push({
    key: "scan",
    label: "掃描名片",
    detail: fmt(contact.created_at),
    icon: ScanLine,
    state: "done",
  });

  if (!offer) {
    steps.push(
      contact.email
        ? { key: "internal", label: "內部確認", detail: "等待回覆", icon: Clock, state: "active" }
        : { key: "internal", label: "內部確認", detail: "缺少 Email", icon: UserX, state: "skipped" }
    );
  } else if (offer.status === "declined") {
    steps.push({ key: "internal", label: "內部確認", detail: `已婉拒（${fmt(offer.resolved_at)}）`, icon: UserX, state: "declined" });
  } else if (offer.status === "accepted") {
    steps.push({ key: "internal", label: "內部確認", detail: `已同意（${fmt(offer.resolved_at)}）`, icon: UserCheck, state: "done" });
  } else {
    steps.push({ key: "internal", label: "內部確認", detail: "等待回覆", icon: Clock, state: "active" });
  }

  const internalDeclinedOrWaiting = !offer || offer.status !== "accepted";

  if (!invite) {
    steps.push({
      key: "sent",
      label: "寄出邀約信",
      detail: internalDeclinedOrWaiting ? undefined : "準備寄出",
      icon: Mail,
      state: internalDeclinedOrWaiting ? "skipped" : "active",
    });
  } else {
    steps.push({ key: "sent", label: "寄出邀約信", detail: fmt(invite.created_at), icon: Mail, state: "done" });
  }

  if (!invite) {
    steps.push({ key: "reply", label: "客戶回覆", icon: MessageSquareText, state: "skipped" });
  } else if (invite.status === "pending") {
    steps.push({ key: "reply", label: "客戶回覆", detail: "等待對方選擇時段", icon: MessageSquareText, state: "active" });
  } else if (invite.status === "confirmed") {
    steps.push({ key: "reply", label: "客戶回覆", detail: `已選擇：${chosenLabelOf(invite)}`, icon: MessageSquareText, state: "done" });
  } else if (invite.status === "failed") {
    steps.push({ key: "reply", label: "客戶回覆", detail: "自動排程失敗", icon: MessageSquareText, state: "failed" });
  } else {
    steps.push({ key: "reply", label: "客戶回覆", detail: "邀約已取消", icon: MessageSquareText, state: "declined" });
  }

  if (!invite || invite.status !== "confirmed") {
    steps.push({ key: "calendar", label: "行事曆建立", icon: CalendarCheck, state: "skipped" });
  } else if (!invite.calendar_event_id) {
    steps.push({ key: "calendar", label: "行事曆建立", detail: "等待對方填寫地點", icon: CalendarCheck, state: "active" });
  } else {
    steps.push({
      key: "calendar",
      label: "行事曆建立",
      detail: invite.location ? `地點：${invite.location}` : "已建立（地點未指定）",
      icon: CalendarCheck,
      state: "done",
    });
  }

  return steps;
}

export default function OutputsPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [senderName, setSenderName] = useState("樊松蒲 Dennis");

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

    fetch("/api/agents/visit")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const name = data?.settings?.senderName;
        if (typeof name === "string" && name) setSenderName(name);
      })
      .catch(() => {});
  }, []);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
                <th className="w-8 px-4 py-3"></th>
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
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                    尚未有透過 LINE 辨識的名片聯絡人
                  </td>
                </tr>
              )}
              {contacts.map((contact) => {
                const { label, tone } = deriveVisitStatus(contact);
                const isOpen = expanded.has(contact.id);
                const invite = latestByCreatedAt(contact.pending_invites ?? []);
                const steps = buildFlowSteps(contact);
                const inviteHtml = invite
                  ? buildInviteEmailHtml({
                      introText: invite.body,
                      senderName,
                      slot1Label: invite.slot1,
                      slot2Label: invite.slot2,
                      respondUrl1: "#",
                      respondUrl2: "#",
                      respondUrlBoth: "#",
                    })
                  : null;

                return (
                  <Fragment key={contact.id}>
                    <tr
                      onClick={() => toggleExpanded(contact.id)}
                      className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-950/50"
                    >
                      <td className="px-4 py-3 text-neutral-400">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
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
                    {isOpen && (
                      <tr key={`${contact.id}-detail`} className="bg-neutral-50/60 dark:bg-neutral-950/40">
                        <td colSpan={6} className="px-6 py-6">
                          <div className="space-y-6">
                            <div>
                              <p className="mb-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                邀約流程
                              </p>
                              <VisitFlowSteps steps={steps} />
                            </div>

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                              {invite && inviteHtml ? (
                                <div>
                                  <p className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                    邀約信內容
                                  </p>
                                  <EmailMessage to={invite.to_email} subject={invite.subject} bodyHtml={inviteHtml} />
                                </div>
                              ) : (
                                <div>
                                  <p className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                    邀約信內容
                                  </p>
                                  <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-xs text-neutral-400 dark:border-neutral-700">
                                    尚未產生邀約信
                                  </div>
                                </div>
                              )}

                              <div className="space-y-4">
                                <div>
                                  <p className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                    客戶回覆
                                  </p>
                                  <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                                    {!invite && <p className="text-neutral-400">尚未寄出邀約信</p>}
                                    {invite?.status === "pending" && (
                                      <p className="text-amber-600 dark:text-amber-400">
                                        邀約信已寄出，尚未收到 {contact.name} 的回覆
                                      </p>
                                    )}
                                    {invite?.status === "confirmed" && (
                                      <p className="text-[#06C755]">
                                        已選擇時段：<span className="font-medium">{chosenLabelOf(invite)}</span>
                                        {invite.chosen_slot === "both" && "（回覆兩個都可以，已安排第一個）"}
                                      </p>
                                    )}
                                    {invite?.status === "failed" && (
                                      <p className="text-red-500">系統自動排程時發生錯誤，尚未成功送出</p>
                                    )}
                                    {invite?.status === "cancelled" && (
                                      <p className="text-neutral-400">這封邀約信已被取消，不會再等待回覆</p>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <p className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                    行事曆狀態
                                  </p>
                                  <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                                    {invite?.calendar_event_id ? (
                                      <p className="text-[#06C755]">
                                        已建立 Google Calendar 邀請
                                        {invite.location ? `，地點：${invite.location}` : "（地點未指定）"}
                                      </p>
                                    ) : (
                                      <p className="text-neutral-400">尚未建立行事曆事件</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
