import "server-only";
import { endVisitRun, reportVisitStep, saveVisitArtifact, startVisitRun } from "@/lib/visit-run";
import type { VisitRuntimePort } from "@/modules/visit/runtime-ports";

export function createLegacyVisitRuntimeAdapter(): VisitRuntimePort {
  return {
    startVisitRun,
    reportVisitStep,
    endVisitRun,
    saveVisitArtifact,
  };
}
