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
  return (
    <div className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0">
      {steps.map((step, i) => {
        const styles = STATE_STYLES[step.state];
        const Icon = step.icon;
        const isLast = i === steps.length - 1;
        return (
          <div key={step.key} className="flex flex-1 sm:flex-col">
            <div className="flex flex-col items-center sm:w-full">
              <div className="flex w-full items-center sm:justify-center">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${styles.circle}`}>
                  <Icon size={15} className={styles.icon} />
                </div>
                {!isLast && (
                  <div className={`hidden h-0.5 flex-1 sm:block ${styles.line}`} style={{ marginLeft: -1 }} />
                )}
              </div>
            </div>
            <div className="ml-3 flex-1 pb-4 sm:ml-0 sm:mt-2 sm:text-center sm:pb-0">
              <p className={`text-xs font-semibold ${styles.label}`}>{step.label}</p>
              {step.detail && <p className="mt-0.5 text-[11px] text-neutral-400">{step.detail}</p>}
            </div>
            {!isLast && <div className={`ml-4 w-0.5 flex-1 sm:hidden ${styles.line}`} style={{ minHeight: 4 }} />}
          </div>
        );
      })}
    </div>
  );
}
