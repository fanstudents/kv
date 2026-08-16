import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import http from "node:http";

const host = process.env.SUPPORT_RELAY_SIMULATOR_HOST ?? "127.0.0.1";
const port = Number(process.env.SUPPORT_RELAY_SIMULATOR_PORT ?? "4010");
const mode = process.env.SUPPORT_RELAY_SIMULATOR_MODE ?? "ack";
const outcome = process.env.SUPPORT_RELAY_SIMULATOR_OUTCOME ?? "success";
const simulatorSecret = process.env.SUPPORT_RELAY_SIMULATOR_SECRET;
const lineSecret = process.env.LINE_SUPPORT_CHANNEL_SECRET;
const lineAccessToken = process.env.LINE_SUPPORT_CHANNEL_ACCESS_TOKEN;
const replyText = process.env.SUPPORT_RELAY_SIMULATOR_REPLY_TEXT ?? "KV Support Relay Simulator 已收到訊息。";
const replyMarker = process.env.SUPPORT_RELAY_SIMULATOR_TEST_MARKER;

if (!simulatorSecret || !lineSecret) {
  console.error("Support relay simulator requires SUPPORT_RELAY_SIMULATOR_SECRET and LINE_SUPPORT_CHANNEL_SECRET");
  process.exit(1);
}

if (!(mode === "ack" || mode === "reply")) {
  console.error(`Unsupported SUPPORT_RELAY_SIMULATOR_MODE: ${mode}`);
  process.exit(1);
}

if (!(outcome === "success" || outcome === "reject" || outcome === "timeout")) {
  console.error(`Unsupported SUPPORT_RELAY_SIMULATOR_OUTCOME: ${outcome}`);
  process.exit(1);
}

if (mode === "reply" && (!lineAccessToken || !replyMarker)) {
  console.error("Reply mode requires LINE_SUPPORT_CHANNEL_ACCESS_TOKEN and SUPPORT_RELAY_SIMULATOR_TEST_MARKER");
  process.exit(1);
}

const receipts = [];

function safeEqual(left, right) {
  const leftValue = Array.isArray(left) ? left[0] : left;
  const rightValue = Array.isArray(right) ? right[0] : right;
  const leftBuffer = Buffer.from(leftValue ?? "");
  const rightBuffer = Buffer.from(rightValue ?? "");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function expectedLineSignature(rawBody) {
  return createHmac("sha256", lineSecret).update(rawBody).digest("base64");
}

function expectedDeliveryKey(rawBody) {
  return `body:${createHash("sha256").update(rawBody, "utf8").digest("hex")}`;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(Object.assign(new Error("request body too large"), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function writeJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function compactReceipt(receipt) {
  return {
    deliveryKey: receipt.deliveryKey,
    eventCount: receipt.eventCount,
    eventTypes: receipt.eventTypes,
    mode,
    configuredOutcome: outcome,
    outcome: receipt.outcome,
    receivedAt: receipt.receivedAt,
  };
}

async function replyToLine(replyToken) {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      authorization: `Bearer ${lineAccessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text: replyText }] }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LINE simulator reply failed (${response.status}): ${body}`);
  }
}

async function handleRelay(request, response) {
  let rawBody;
  try {
    rawBody = await readBody(request);
  } catch (error) {
    writeJson(response, error?.statusCode ?? 400, { ok: false, error: error instanceof Error ? error.message : "invalid body" });
    return;
  }

  const signature = request.headers["x-line-signature"];
  const deliveryKey = request.headers["x-kv-support-relay-key"];
  if (!safeEqual(signature, expectedLineSignature(rawBody))) {
    writeJson(response, 401, { ok: false, error: "invalid line signature" });
    return;
  }
  if (!safeEqual(deliveryKey, expectedDeliveryKey(rawBody))) {
    writeJson(response, 400, { ok: false, error: "invalid relay delivery key" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    writeJson(response, 400, { ok: false, error: "invalid JSON" });
    return;
  }

  if (!Array.isArray(payload?.events)) {
    writeJson(response, 400, { ok: false, error: "events must be an array" });
    return;
  }

  const events = payload.events.filter((event) => event && typeof event === "object");
  const receipt = {
    deliveryKey,
    eventCount: events.length,
    eventTypes: events.map((event) => typeof event.type === "string" ? event.type : "unknown"),
    outcome: "received",
    receivedAt: new Date().toISOString(),
  };

  if (outcome === "reject" || outcome === "timeout") {
    if (outcome === "timeout") await new Promise((resolve) => setTimeout(resolve, 9000));
    receipt.outcome = outcome === "reject" ? "forced_rejection" : "forced_timeout";
    receipts.push(receipt);
    console.error(JSON.stringify({ simulator: "support-relay", ...compactReceipt(receipt) }));
    writeJson(response, outcome === "reject" ? 503 : 504, { ok: false, receipt: compactReceipt(receipt) });
    return;
  }

  if (mode === "reply") {
    const replyEvents = events.filter((event) =>
      event.type === "message" &&
      typeof event.replyToken === "string" &&
      typeof event.message?.text === "string" &&
      event.message.text.includes(replyMarker)
    );

    try {
      for (const event of replyEvents) await replyToLine(event.replyToken);
      receipt.outcome = replyEvents.length > 0 ? "replied" : "received_no_matching_test_marker";
    } catch (error) {
      receipt.outcome = "reply_failed";
      receipts.push(receipt);
      console.error(JSON.stringify({ simulator: "support-relay", ...compactReceipt(receipt), error: error instanceof Error ? error.message : String(error) }));
      writeJson(response, 502, { ok: false, receipt: compactReceipt(receipt) });
      return;
    }
  }

  receipts.push(receipt);
  console.log(JSON.stringify({ simulator: "support-relay", ...compactReceipt(receipt) }));
  writeJson(response, 200, { ok: true, receipt: compactReceipt(receipt) });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    writeJson(response, 200, { ok: true, service: "support-relay-simulator", mode, outcome, receiptCount: receipts.length });
    return;
  }

  if (request.method === "GET" && request.url === "/receipts") {
    if (!safeEqual(request.headers["x-simulator-secret"], simulatorSecret)) {
      writeJson(response, 401, { ok: false, error: "unauthorized" });
      return;
    }
    writeJson(response, 200, { ok: true, receipts: receipts.map(compactReceipt) });
    return;
  }

  if (request.method === "POST" && request.url === "/relay") {
    await handleRelay(request, response);
    return;
  }

  writeJson(response, 404, { ok: false, error: "not found" });
});

server.listen(port, host, () => {
  const address = server.address();
  const boundPort = typeof address === "object" && address ? address.port : port;
  console.log(JSON.stringify({ ready: true, service: "support-relay-simulator", host, port: boundPort, mode, outcome }));
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
