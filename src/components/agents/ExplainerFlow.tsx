import VisitFlowSteps, { type FlowStep } from "./VisitFlowSteps";
import type { CatalogFlowStep } from "@/lib/agent-catalog";

// 目錄頁用的「說明版」流程節點：不代表真實執行狀態，單純把每一步驟走一遍，
// 讓瀏覽者一眼看懂這個 Agent 實際上在做什麼。視覺上沿用後台 VisitFlowSteps
// 同一套元件，維持一致的節點／連接線樣式。
export default function ExplainerFlow({ steps }: { steps: CatalogFlowStep[] }) {
  const flowSteps: FlowStep[] = steps.map((s, i) => ({
    key: `${i}-${s.label}`,
    label: s.label,
    icon: s.icon,
    state: "done",
  }));
  return <VisitFlowSteps steps={flowSteps} />;
}
