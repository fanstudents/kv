export type VisitFlowMode = "legacy" | "shadow" | "new";

export interface VisitFlowPlan {
  mode: VisitFlowMode;
  runLegacy: boolean;
  evaluateNew: boolean;
  executeNewIntents: boolean;
}

export class InvalidVisitFlowModeError extends Error {}

export function parseVisitFlowMode(value: string | undefined): VisitFlowMode {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "legacy";
  if (normalized === "legacy" || normalized === "shadow" || normalized === "new") {
    return normalized;
  }
  throw new InvalidVisitFlowModeError(`Unsupported Visit flow mode: ${value}`);
}

export function planVisitFlow(mode: VisitFlowMode): VisitFlowPlan {
  switch (mode) {
    case "legacy":
      return {
        mode,
        runLegacy: true,
        evaluateNew: false,
        executeNewIntents: false,
      };
    case "shadow":
      return {
        mode,
        runLegacy: true,
        evaluateNew: true,
        executeNewIntents: false,
      };
    case "new":
      return {
        mode,
        runLegacy: false,
        evaluateNew: true,
        executeNewIntents: true,
      };
  }
}
