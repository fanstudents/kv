export const OPENAI_ACCEPTANCE_ESTIMATED_MAX_USD = 0.05;
export const OPENAI_ACCEPTANCE_HARD_MAX_USD = 0.1;

export interface OpenAiAcceptanceCostApproval {
  approvedMaxUsd: number;
  estimatedMaxUsd: number;
}

export function assertOpenAiAcceptanceCostGate(
  env: Readonly<Record<string, string | undefined>> = process.env
): OpenAiAcceptanceCostApproval {
  if (env.OPENAI_ACCEPTANCE !== "1") {
    throw new Error(
      "OpenAI acceptance is opt-in. Set OPENAI_ACCEPTANCE=1 before running npm run acceptance:openai."
    );
  }

  const rawApprovedMax = env.OPENAI_ACCEPTANCE_MAX_USD?.trim();
  if (!rawApprovedMax) {
    throw new Error(
      `OpenAI acceptance requires OPENAI_ACCEPTANCE_MAX_USD between US$${OPENAI_ACCEPTANCE_ESTIMATED_MAX_USD.toFixed(2)} and US$${OPENAI_ACCEPTANCE_HARD_MAX_USD.toFixed(2)}; no provider calls were made.`
    );
  }

  const approvedMaxUsd = Number(rawApprovedMax);
  if (!Number.isFinite(approvedMaxUsd) || approvedMaxUsd <= 0) {
    throw new Error("OPENAI_ACCEPTANCE_MAX_USD must be a positive US dollar amount; no provider calls were made.");
  }
  if (approvedMaxUsd < OPENAI_ACCEPTANCE_ESTIMATED_MAX_USD) {
    throw new Error(
      `OpenAI acceptance has a conservative estimated maximum of US$${OPENAI_ACCEPTANCE_ESTIMATED_MAX_USD.toFixed(2)}, above the approved US$${approvedMaxUsd.toFixed(2)}; no provider calls were made.`
    );
  }
  if (approvedMaxUsd > OPENAI_ACCEPTANCE_HARD_MAX_USD) {
    throw new Error(
      `OPENAI_ACCEPTANCE_MAX_USD cannot exceed the acceptance hard limit of US$${OPENAI_ACCEPTANCE_HARD_MAX_USD.toFixed(2)}; no provider calls were made.`
    );
  }

  return {
    approvedMaxUsd,
    estimatedMaxUsd: OPENAI_ACCEPTANCE_ESTIMATED_MAX_USD,
  };
}
