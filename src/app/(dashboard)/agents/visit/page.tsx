"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, ScanLine, Sparkles, RotateCcw } from "lucide-react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextInput, TextArea, Select } from "@/components/ui/Field";
import Toggle from "@/components/ui/Toggle";
import EmailMessage from "@/components/agents/EmailMessage";
import { buildInviteEmailHtml } from "@/lib/email-templates";

const agent = getAgent("visit")!;

const INPUT_SOURCES = ["名片圖片", "轉寄 Email"];

const FALLBACK_CONTACT = { name: "林小姐", company: "", title: "", email: "lin@example-partner.com", phone: "" };

function formatSlot(date: Date) {
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()}（${weekday}）${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function computeSampleSlots(startDays: number, endDays: number, workingStart: string) {
  const [h, m] = workingStart.split(":").map((n) => Number(n) || 0);
  const base = new Date();
  const d1 = new Date(base);
  d1.setDate(base.getDate() + startDays);
  d1.setHours(h, m, 0, 0);
  const d2 = new Date(base);
  d2.setDate(base.getDate() + Math.max(endDays, startDays + 1));
  d2.setHours(h, m, 0, 0);
  return [formatSlot(d1), formatSlot(d2)];
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function VisitAgentPage() {
  const [inputSources, setInputSources] = useState<string[]>(INPUT_SOURCES);
  const [calendarSource, setCalendarSource] = useState("google");
  const [rangeStartDays, setRangeStartDays] = useState("3");
  const [rangeEndDays, setRangeEndDays] = useState("7");
  const [slotCount, setSlotCount] = useState("2");
  const [meetingDuration, setMeetingDuration] = useState("60");
  const [meetingType, setMeetingType] = useState("喝咖啡");
  const [workingHoursStart, setWorkingHoursStart] = useState("09:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("18:00");
  const [requireApproval, setRequireApproval] = useState(true);
  const [senderName, setSenderName] = useState("樊松蒲 Dennis");
  const [emailSubject, setEmailSubject] = useState("{{myName}} 想與您約時間{{meetingType}} ☕");
  const [emailBody, setEmailBody] = useState(
    "{{contactName}} 您好，\n\n很高興認識您！不知道您接下來方便的話，是否能約個時間{{meetingType}}聊聊？"
  );
  const [lineConfirmTemplate, setLineConfirmTemplate] = useState(
    "已為您寄出邀約信給 {{contactName}}，提議 {{slot1}} 或 {{slot2}} 見面，等候對方回覆。"
  );

  // --- OCR + AI draft test panel state (not gated by the enabled toggle) ---
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [contact, setContact] = useState(FALLBACK_CONTACT);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [aiDraft, setAiDraft] = useState<{ subject: string; body: string } | null>(null);

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (Array.isArray(s.inputSources)) setInputSources(s.inputSources as string[]);
    if (typeof s.calendarSource === "string") setCalendarSource(s.calendarSource);
    if (typeof s.rangeStartDays === "string") setRangeStartDays(s.rangeStartDays);
    if (typeof s.rangeEndDays === "string") setRangeEndDays(s.rangeEndDays);
    if (typeof s.slotCount === "string") setSlotCount(s.slotCount);
    if (typeof s.meetingDuration === "string") setMeetingDuration(s.meetingDuration);
    if (typeof s.meetingType === "string") setMeetingType(s.meetingType);
    if (typeof s.workingHoursStart === "string") setWorkingHoursStart(s.workingHoursStart);
    if (typeof s.workingHoursEnd === "string") setWorkingHoursEnd(s.workingHoursEnd);
    if (typeof s.requireApproval === "boolean") setRequireApproval(s.requireApproval);
    if (typeof s.senderName === "string") setSenderName(s.senderName);
    if (typeof s.emailSubject === "string") setEmailSubject(s.emailSubject);
    if (typeof s.emailBody === "string") setEmailBody(s.emailBody);
    if (typeof s.lineConfirmTemplate === "string") setLineConfirmTemplate(s.lineConfirmTemplate);
  }, []);

  const toggleSource = (s: string) => {
    setInputSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const [slot1, slot2] = useMemo(
    () => computeSampleSlots(Number(rangeStartDays) || 3, Number(rangeEndDays) || 5, workingHoursStart),
    [rangeStartDays, rangeEndDays, workingHoursStart]
  );

  const handleCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError("");
    setParsing(true);
    setAiDraft(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/agents/visit/parse-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "名片辨識失敗");
      setContact({
        name: data.contact.name || FALLBACK_CONTACT.name,
        company: data.contact.company,
        title: data.contact.title,
        email: data.contact.email || FALLBACK_CONTACT.email,
        phone: data.contact.phone,
      });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "名片辨識失敗");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  const handleDraftEmail = async () => {
    setDraftError("");
    setDrafting(true);
    try {
      const res = await fetch("/api/agents/visit/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: contact.name,
          contactTitle: contact.title,
          company: contact.company,
          meetingType,
          slot1,
          slot2,
          senderName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "邀約信生成失敗");
      setAiDraft(data.draft);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "邀約信生成失敗");
    } finally {
      setDrafting(false);
    }
  };

  const fill = (t: string) =>
    t
      .replace(/{{contactName}}/g, contact.name)
      .replace(/{{myName}}/g, senderName)
      .replace(/{{meetingType}}/g, meetingType)
      .replace(/{{slot1}}/g, slot1)
      .replace(/{{slot2}}/g, slot2);

  const previewSubject = aiDraft ? aiDraft.subject : fill(emailSubject);
  const previewBody = aiDraft ? aiDraft.body : fill(emailBody);
  const previewLineText = fill(lineConfirmTemplate);

  const previewHtml = useMemo(
    () =>
      buildInviteEmailHtml({
        introText: previewBody,
        senderName,
        slot1Label: slot1,
        slot2Label: slot2,
        respondUrl1: "#",
        respondUrl2: "#",
        respondUrlBoth: "#",
      }),
    [previewBody, senderName, slot1, slot2]
  );

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS.visit}
      onSettingsLoaded={onSettingsLoaded}
      previewText={previewLineText}
      previewTitle="邀約預覽"
      testPushLabel="傳送 LINE 確認通知測試"
      settings={{
        inputSources,
        calendarSource,
        rangeStartDays,
        rangeEndDays,
        slotCount,
        meetingDuration,
        meetingType,
        workingHoursStart,
        workingHoursEnd,
        requireApproval,
        senderName,
        emailSubject,
        emailBody,
        lineConfirmTemplate,
      }}
      settingsForm={
        <div className="space-y-4">
          <Field label="觸發輸入來源" hint="傳送給官方帳號的訊息類型，符合其一即會啟動流程">
            <div className="flex flex-wrap gap-3">
              {INPUT_SOURCES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={inputSources.includes(s)}
                    onChange={() => toggleSource(s)}
                    className="h-4 w-4 rounded border-neutral-300 text-[#06C755] focus:ring-[#06C755]"
                  />
                  {s}
                </label>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="串接行事曆">
              <Select value={calendarSource} onChange={(e) => setCalendarSource(e.target.value)}>
                <option value="google">Google Calendar</option>
                <option value="outlook">Outlook 行事曆</option>
                <option value="none">尚未串接</option>
              </Select>
            </Field>
            <Field label="會面性質">
              <TextInput value={meetingType} onChange={(e) => setMeetingType(e.target.value)} />
            </Field>
            <Field label="寄件人署名">
              <TextInput value={senderName} onChange={(e) => setSenderName(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field label="搜尋起始（天後）">
              <TextInput type="number" min={0} value={rangeStartDays} onChange={(e) => setRangeStartDays(e.target.value)} />
            </Field>
            <Field label="搜尋結束（天後）">
              <TextInput type="number" min={1} value={rangeEndDays} onChange={(e) => setRangeEndDays(e.target.value)} />
            </Field>
            <Field label="建議時段數">
              <TextInput type="number" min={1} max={5} value={slotCount} onChange={(e) => setSlotCount(e.target.value)} />
            </Field>
            <Field label="每次會面時長（分）">
              <TextInput type="number" min={15} step={15} value={meetingDuration} onChange={(e) => setMeetingDuration(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="可預約時間範圍開始">
              <TextInput type="time" value={workingHoursStart} onChange={(e) => setWorkingHoursStart(e.target.value)} />
            </Field>
            <Field label="可預約時間範圍結束">
              <TextInput type="time" value={workingHoursEnd} onChange={(e) => setWorkingHoursEnd(e.target.value)} />
            </Field>
          </div>

          <Toggle
            checked={requireApproval}
            onChange={setRequireApproval}
            label="寄出邀約信前，先透過 LINE 讓我確認時段"
          />

          <Field label="邀約信主旨" hint="可使用變數 {{myName}}、{{meetingType}}">
            <TextInput value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
          </Field>

          <Field
            label="邀約信內文範本"
            hint="可使用變數 {{contactName}}、{{myName}}、{{meetingType}}、{{slot1}}、{{slot2}}"
          >
            <TextArea rows={6} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
          </Field>

          <Field label="LINE 確認通知範本" hint="邀約信寄出後，回報給您的 LINE 訊息">
            <TextArea rows={2} value={lineConfirmTemplate} onChange={(e) => setLineConfirmTemplate(e.target.value)} />
          </Field>
        </div>
      }
      preview={
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              <ScanLine size={14} /> 測試：上傳名片圖片辨識
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleCardUpload}
              disabled={parsing}
              className="mb-2 block w-full text-xs text-neutral-500 file:mr-2 file:rounded-md file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs file:text-neutral-600 dark:file:bg-neutral-800 dark:file:text-neutral-300"
            />
            {parsing && (
              <p className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Loader2 size={12} className="animate-spin" /> 辨識中…
              </p>
            )}
            {parseError && <p className="text-xs text-red-500">{parseError}</p>}

            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={contact.name}
                onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                placeholder="姓名"
                className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950"
              />
              <input
                value={contact.company}
                onChange={(e) => setContact((c) => ({ ...c, company: e.target.value }))}
                placeholder="公司"
                className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950"
              />
              <input
                value={contact.title}
                onChange={(e) => setContact((c) => ({ ...c, title: e.target.value }))}
                placeholder="職稱"
                className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950"
              />
              <input
                value={contact.email}
                onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                placeholder="Email"
                className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>

            <button
              type="button"
              onClick={handleDraftEmail}
              disabled={drafting || !contact.name}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              {drafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              用 AI 產生邀約信
            </button>
            {draftError && <p className="mt-1 text-xs text-red-500">{draftError}</p>}
            {aiDraft && (
              <button
                type="button"
                onClick={() => setAiDraft(null)}
                className="mt-1 flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600"
              >
                <RotateCcw size={11} /> 改用範本預覽
              </button>
            )}
            <p className="mt-2 text-[11px] leading-snug text-neutral-400">
              時段（{slot1} / {slot2}）僅為預覽用途，依「搜尋範圍」設定試算；實際透過 LINE 觸發時會查詢您 Google Calendar 的真實空檔。
            </p>
          </div>

          {aiDraft && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-neutral-900">
              <Sparkles size={10} /> AI 產生草稿
            </span>
          )}
          <EmailMessage to={contact.email} subject={previewSubject} bodyHtml={previewHtml} />
        </div>
      }
    />
  );
}
