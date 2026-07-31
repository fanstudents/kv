import type { VisitBusinessCard, VisitEmailDraft, VisitProviderPort } from "./provider-port";

export interface VisitAiActivity {
  summary: string;
  status: "failed" | "success";
}

export type VisitAiPort = Pick<VisitProviderPort, "parseBusinessCard" | "draftInviteEmail"> & {
  recordActivity(activity: VisitAiActivity): Promise<void>;
};

export type VisitAiResult<TData> =
  | { kind: "error"; message: string }
  | { kind: "ok"; data: TData };

export type VisitAiCardResult = VisitAiResult<VisitBusinessCard>;
export type VisitAiEmailResult = VisitAiResult<VisitEmailDraft>;
