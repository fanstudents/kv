import { ArrowDown, ArrowUp } from "lucide-react";

// 統一的重點數字卡：label + value + 可選的變化量（正值＝綠色向上，負值＝紅色向下）。
// 呼叫端要先把「正值＝變好」的語意正規化好（例如排名用「進步名次」而非原始名次差），
// 這裡只負責畫出方向與顏色，不判斷業務意義。
export default function StatTile({
  label,
  value,
  delta,
  deltaSuffix = "",
  hint,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaSuffix?: string;
  hint?: string;
}) {
  const hasDelta = typeof delta === "number" && delta !== 0;
  const isUp = hasDelta && (delta as number) > 0;

  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-900">
      <p className="text-[11px] text-neutral-400">{label}</p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">{value}</p>
        {hasDelta && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-medium ${
              isUp ? "text-[#06C755]" : "text-red-500"
            }`}
          >
            {isUp ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {Math.abs(delta as number).toLocaleString("en-US")}
            {deltaSuffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-0.5 text-[10px] text-neutral-400">{hint}</p>}
    </div>
  );
}
