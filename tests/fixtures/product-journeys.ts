export type JourneySideEffect =
  | "persist"
  | "openai"
  | "line"
  | "google-calendar"
  | "gmail"
  | "firecrawl"
  | "browser-response";

export interface JourneyStep {
  id: string;
  owner: string;
  entrypoint: string;
  sideEffects: JourneySideEffect[];
  failureSemantics: string;
}

export interface ProductJourney {
  id: "visit-invite" | "knowledge-publish" | "meeting-round";
  trigger: "webhook" | "operator" | "browser";
  steps: JourneyStep[];
  preservedOutcome: string;
}

export const PRODUCT_JOURNEYS: ProductJourney[] = [
  {
    id: "visit-invite",
    trigger: "webhook",
    preservedOutcome: "Business card becomes a confirmed visit with calendar, email, LINE, and research follow-up.",
    steps: [
      {
        id: "capture-card",
        owner: "LINE webhook",
        entrypoint: "/api/line/webhook",
        sideEffects: ["line", "openai", "persist"],
        failureSemantics: "Reply with the current error copy and close the active Visit run as failed.",
      },
      {
        id: "prepare-invite",
        owner: "Visit workflow",
        entrypoint: "src/lib/visit-run.ts#startVisitRun",
        sideEffects: ["persist"],
        failureSemantics: "Missing persistence does not invent a successful run.",
      },
      {
        id: "accept-slot",
        owner: "Visit public callback",
        entrypoint: "/api/agents/visit/respond",
        sideEffects: ["browser-response", "persist"],
        failureSemantics: "Repeated clicks render the existing already-confirmed response.",
      },
      {
        id: "fulfil-visit",
        owner: "Visit public callback",
        entrypoint: "/api/agents/visit/respond",
        sideEffects: ["google-calendar", "gmail", "line", "persist", "openai"],
        failureSemantics: "Mark failed, notify the operator, and still acknowledge the visitor's selection.",
      },
    ],
  },
  {
    id: "knowledge-publish",
    trigger: "operator",
    preservedOutcome: "Imported or crawled material remains draft until review, then becomes searchable Agent context.",
    steps: [
      {
        id: "ingest",
        owner: "Knowledge import",
        entrypoint: "/api/knowledge-base/import",
        sideEffects: ["openai", "persist"],
        failureSemantics: "Reject invalid or oversized input without publishing partial knowledge.",
      },
      {
        id: "review-publish",
        owner: "Knowledge curation",
        entrypoint: "/api/knowledge-base/import",
        sideEffects: ["persist"],
        failureSemantics: "An empty selection remains a validation error.",
      },
      {
        id: "index",
        owner: "Knowledge search",
        entrypoint: "/api/knowledge-base/reindex",
        sideEffects: ["openai", "persist"],
        failureSemantics: "Index failure does not change draft/published ownership.",
      },
      {
        id: "consume",
        owner: "Knowledge context",
        entrypoint: "src/lib/knowledge-base.ts#knowledgeContext",
        sideEffects: ["persist"],
        failureSemantics: "No matching context yields the current empty-context behavior.",
      },
    ],
  },
  {
    id: "meeting-round",
    trigger: "browser",
    preservedOutcome: "A boss command produces either one targeted reply or a multi-Agent round plus Team Lead synthesis.",
    steps: [
      {
        id: "start",
        owner: "Meeting session",
        entrypoint: "/api/meeting/start",
        sideEffects: ["persist"],
        failureSemantics: "The UI can continue with the route's existing null/error handling.",
      },
      {
        id: "respond",
        owner: "Meeting command",
        entrypoint: "/api/meeting/command",
        sideEffects: ["openai", "persist"],
        failureSemantics: "Provider failure remains a 502; history write failure does not suppress a generated reply.",
      },
      {
        id: "voice-and-usage",
        owner: "Meeting media",
        entrypoint: "/api/meeting/speak",
        sideEffects: ["openai"],
        failureSemantics: "Speech failure remains independent from the text reply.",
      },
      {
        id: "finish",
        owner: "Meeting session",
        entrypoint: "/api/meeting/finish",
        sideEffects: ["persist"],
        failureSemantics: "Finish keeps the current API status and response contract.",
      },
    ],
  },
];
