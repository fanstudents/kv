import { Mail } from "lucide-react";

export default function EmailMessage({
  to,
  subject,
  body,
  bodyHtml,
  from = "service@tbr.digital",
}: {
  to: string;
  subject: string;
  body?: string;
  bodyHtml?: string;
  from?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-950">
        <Mail size={14} className="text-neutral-400" />
        <span className="text-xs font-medium text-neutral-500">草稿預覽</span>
      </div>
      <div className="space-y-1.5 border-b border-neutral-100 px-4 py-3 text-xs dark:border-neutral-800">
        <div className="flex gap-2">
          <span className="w-10 shrink-0 text-neutral-400">寄件人</span>
          <span className="text-neutral-700 dark:text-neutral-300">{from}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-10 shrink-0 text-neutral-400">收件人</span>
          <span className="text-neutral-700 dark:text-neutral-300">{to || "（尚未取得對方 Email）"}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-10 shrink-0 text-neutral-400">主旨</span>
          <span className="font-medium text-neutral-800 dark:text-neutral-100">{subject}</span>
        </div>
      </div>
      {bodyHtml ? (
        <iframe
          title="邀約信 HTML 預覽"
          srcDoc={bodyHtml}
          sandbox=""
          className="h-[600px] w-full bg-white"
        />
      ) : (
        <div className="whitespace-pre-line px-4 py-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {body}
        </div>
      )}
    </div>
  );
}
