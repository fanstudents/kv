"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CHECKLIST } from "@/lib/checklist-data";

const SEVERITY_TONE: Record<string, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

const SEVERITY_LABEL: Record<string, string> = {
  high: "需優先處理",
  medium: "重要",
  low: "次要",
};

export default function TodosPage() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/checklist")
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: { item_id: string; done: boolean }[]) => {
        const map: Record<string, boolean> = {};
        rows.forEach((r) => {
          map[r.item_id] = r.done;
        });
        setDone(map);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggle = async (id: string) => {
    const next = !done[id];
    setDone((prev) => ({ ...prev, [id]: next }));
    await fetch(`/api/checklist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: next }),
    }).catch(() => {});
  };

  const categories = useMemo(() => {
    const groups = new Map<string, typeof CHECKLIST>();
    CHECKLIST.forEach((item) => {
      const list = groups.get(item.category) ?? [];
      list.push(item);
      groups.set(item.category, list);
    });
    return Array.from(groups.entries());
  }, []);

  const doneCount = CHECKLIST.filter((i) => done[i.id]).length;
  const total = CHECKLIST.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="待辦總覽"
        description="上線前後你該知道的所有待辦事項，勾選已完成的項目，狀態會自動保存"
      />

      <Card className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-neutral-700 dark:text-neutral-200">
            {loaded ? `${doneCount} / ${total} 已完成` : "載入中…"}
          </span>
          <span className="text-neutral-400">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div className="h-full rounded-full bg-[#06C755] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      <div className="space-y-6">
        {categories.map(([category, items]) => (
          <Card key={category}>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">{category}</h2>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className="mt-0.5 shrink-0 text-neutral-300 hover:text-[#06C755] dark:text-neutral-600"
                  >
                    {done[item.id] ? (
                      <CheckCircle2 size={18} className="text-[#06C755]" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          done[item.id]
                            ? "text-neutral-400 line-through"
                            : "text-neutral-800 dark:text-neutral-100"
                        }`}
                      >
                        {item.title}
                      </p>
                      <Badge tone={SEVERITY_TONE[item.severity]}>{SEVERITY_LABEL[item.severity]}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
