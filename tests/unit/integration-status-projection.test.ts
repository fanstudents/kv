import { describe, expect, it } from "vitest";
import {
  integrationConnectionState,
  type Integration,
} from "@/lib/integrations-data";

const builtin: Integration = {
  id: "firecrawl",
  name: "Firecrawl",
  provider: "Firecrawl",
  category: "其他",
  link: "https://example.test",
  status: "connected",
  icon: "firecrawl",
  color: "#000000",
  uses: [],
  builtin: true,
};

describe("integration status projection", () => {
  it("does not treat seed status as live evidence while the request is loading", () => {
    expect(integrationConnectionState(builtin, null)).toBe("loading");
  });

  it("uses the live status result for built-in services", () => {
    expect(integrationConnectionState(builtin, { firecrawl: { connected: true } })).toBe("connected");
    expect(integrationConnectionState(builtin, { firecrawl: { connected: false } })).toBe("disconnected");
    expect(integrationConnectionState(builtin, {})).toBe("disconnected");
  });

  it("keeps a failed live probe distinct from a verified disconnected service", () => {
    expect(integrationConnectionState(builtin, null, true)).toBe("error");
    expect(integrationConnectionState(builtin, { firecrawl: { connected: false } }, true)).toBe("error");
  });

  it("does not claim a custom localStorage service is connected without a live probe", () => {
    expect(integrationConnectionState({
      ...builtin,
      id: "custom-slack",
      builtin: false,
      status: "connected",
    }, { "custom-slack": { connected: true } })).toBe("disconnected");
  });
});
