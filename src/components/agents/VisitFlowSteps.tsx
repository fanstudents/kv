import type { LucideIcon } from "lucide-react";

export type FlowStepState = "done" | "active" | "declined" | "failed" | "skipped";

export interface FlowStep {
  key: string;
  label: string;
  detail?: string;
  icon: LucideIcon;
  state: FlowStepState;
}

const STATE_STYLES: Record<FlowStepState, { circle: string; icon: string; label: string; line: string }> = {
  done: {
    circle: "bg-[#06C755] border-[#06C755]",
    icon: "text-white",
    label: "text-neutral-800 dark:text-neutral-100",
    line: "bg-[#06C755]",
  },
  active: {
    circle: "bg-amber-500 border-amber-500",
    icon: "text-white",
    label: "text-neutral-800 dark:text-neutral-100",
    line: "bg-neutral-200 dark:bg-neutral-700",
  },
  declined: {
    circle: "bg-neutral-400 border-neutral-400 dark:bg-neutral-600 dark:border-neutral-600",
    icon: "text-white",
    label: "text-neutral-500 dark:text-neutral-400",
    line: "bg-neutral-200 dark:bg-neutral-700",
  },
  failed: {
    circle: "bg-red-500 border-red-500",
    icon: "text-white",
    label: "text-neutral-800 dark:text-neutral-100",
    line: "bg-neutral-200 dark:bg-neutral-700",
  },
  skipped: {
    circle: "bg-white border-neutral-300 dark:bg-neutral-900 dark:border-neutral-700",
    icon: "text-neutral-300 dark:text-neutral-600",
    label: "text-neutral-400 dark:text-neutral-600",
    line: "bg-neutral-200 dark:bg-neutral-700",
  },
};

export default function VisitFlowSteps({ steps }: { steps: FlowStep[] }) {
  const isLast = (i: number) => i === steps.length - 1;
  return (
    <div className="flex items-start">
      {steps.map((step, i) => {
        const styles = STATE_STYLES[step.state];
        const Icon = step.icon;
        return (
          <div key={step.key} className="relative flex flex-1 flex-col items-center">
            {/* 連接線：從本節點圓心延伸到下一節點圓心（等寬欄，w-full 剛好一欄） */}
            {!isLast(i) && (
              <span className={`absolute left-1/2 top-4 z-0 h-0.5 w-full ${styles.line}`} />
            )}
            <div
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${styles.circle}`}
            >
              <Icon size={15} className={styles.icon} />
            </div>
            <p className={`mt-2 px-1 text-center text-[11px] font-semibold leading-tight sm:text-xs ${styles.label}`}>
              {step.label}
            </p>
            {step.detail && (
              <p className="mt-0.5 px-1 text-center text-[10px] leading-tight text-neutral-400">{step.detail}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
