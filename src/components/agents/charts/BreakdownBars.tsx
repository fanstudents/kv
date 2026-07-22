export interface BreakdownItem {
  label: string;
  value: number;
  color?: string;
}

// 排名式的類別拆分(GA4 渠道、專案類型…):標籤 + 數值 + 一條依比例填色的橫條,
// 顏色只用來標識類別本身,文字一律走中性色,不靠顏色本身傳達數值。
export default function BreakdownBars({
  items,
  valueFormatter = (v: number) => v.toLocaleString("en-US"),
}: {
  items: BreakdownItem[];
  valueFormatter?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-neutral-600 dark:text-neutral-300">{item.label}</span>
            <span className="shrink-0 font-medium text-neutral-800 dark:text-neutral-100">
              {valueFormatter(item.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%`, background: item.color ?? "#737373" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
