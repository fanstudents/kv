"use client";

export default function RangeToggle({
  value,
  onChange,
  options = [7, 14, 30],
}: {
  value: number;
  onChange: (days: number) => void;
  options?: number[];
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-neutral-200 p-0.5 dark:border-neutral-700">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            value === o
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          {o} 天
        </button>
      ))}
    </div>
  );
}
