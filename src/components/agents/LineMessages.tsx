export function LineTextMessage({
  text,
  caption,
  timestamp,
  accentColor = "#06C755",
}: {
  text: string;
  caption?: string;
  timestamp: string;
  accentColor?: string;
}) {
  return (
    <div className="flex flex-col items-start">
      <div
        className="max-w-[220px] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line text-neutral-800 shadow"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        {text}
      </div>
      <div className="mt-1 flex items-center gap-1.5 pl-1 text-[10px] text-white/80">
        {caption && <span>{caption}</span>}
        <span>{timestamp}</span>
      </div>
    </div>
  );
}

export interface KpiRow {
  label: string;
  value: string;
}

export function LineCardMessage({
  title,
  date,
  accentColor = "#2F7DE1",
  kpis,
  deltas,
  suggestion,
  caption,
  timestamp,
}: {
  title: string;
  date: string;
  accentColor?: string;
  kpis: KpiRow[];
  deltas?: string[];
  suggestion?: string;
  caption: string;
  timestamp: string;
}) {
  return (
    <div className="flex flex-col items-start">
      <div className="w-[240px] overflow-hidden rounded-xl bg-white shadow">
        <div className="px-3 py-2 text-white" style={{ backgroundColor: accentColor }}>
          <p className="text-[12px] font-semibold">{title}</p>
          <p className="text-[10px] opacity-90">{date}</p>
        </div>
        <div className="space-y-1 px-3 py-2">
          {kpis.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500">{row.label}</span>
              <span className="font-semibold text-neutral-800">{row.value}</span>
            </div>
          ))}
        </div>
        {deltas && deltas.length > 0 && (
          <div className="flex gap-1 px-3 pb-2">
            {deltas.map((d) => (
              <span
                key={d}
                className="rounded-md bg-[#06C755]/10 px-1.5 py-0.5 text-center text-[10px] font-medium text-[#06C755]"
              >
                {d}
              </span>
            ))}
          </div>
        )}
        {suggestion && (
          <div className="mx-3 mb-3 rounded-md bg-neutral-50 px-2 py-1.5 text-[10px] leading-relaxed text-neutral-600">
            <p className="mb-0.5 font-semibold text-neutral-500">行動建議</p>
            {suggestion}
          </div>
        )}
      </div>
      <div className="mt-1 flex items-center gap-1.5 pl-1 text-[10px] text-white/80">
        <span>{caption}</span>
        <span>{timestamp}</span>
      </div>
    </div>
  );
}
