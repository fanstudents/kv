import { CheckCircle2, XCircle, Clock } from "lucide-react";
import type { AgentActivity } from "@/lib/types";

const ICON = {
  success: <CheckCircle2 size={16} className="text-[#06C755]" />,
  failed: <XCircle size={16} className="text-red-500" />,
  pending: <Clock size={16} className="text-amber-500" />,
};

export default function ActivityLog({ items }: { items: AgentActivity[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-neutral-400">尚無執行紀錄</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3">
          <div className="mt-0.5">{ICON[item.status]}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-neutral-700 dark:text-neutral-200">{item.summary}</p>
            <p className="text-xs text-neutral-400">{item.timestamp}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
