import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractUnits,
  extractTokens,
  calculateCost,
  calculateRevenue,
} from "./token-extractor";

// --- OpenAI -----------------------------------------------------------------
test("openai: reads usage.total_tokens", () => {
  const n = extractUnits("openai", {
    responseBody: { usage: { total_tokens: 1234 } },
  });
  assert.equal(n, 1234);
});

test("openai: falls back to prompt + completion when total absent", () => {
  const n = extractUnits("openai", {
    responseBody: { usage: { prompt_tokens: 100, completion_tokens: 50 } },
  });
  assert.equal(n, 150);
});

test("openai: no usage object -> 0", () => {
  assert.equal(extractUnits("openai", { responseBody: { id: "x" } }), 0);
  assert.equal(extractUnits("openai", { responseBody: undefined }), 0);
});

// --- Anthropic --------------------------------------------------------------
test("anthropic: sums input + output tokens", () => {
  const n = extractUnits("anthropic", {
    responseBody: { usage: { input_tokens: 80, output_tokens: 20 } },
  });
  assert.equal(n, 100);
});

test("anthropic: handles a missing half", () => {
  assert.equal(
    extractUnits("anthropic", { responseBody: { usage: { input_tokens: 7 } } }),
    7
  );
});

// --- ElevenLabs (character-billed, binary response) -------------------------
test("elevenlabs: counts characters of request.text when no header", () => {
  const n = extractUnits("elevenlabs", {
    requestBody: { text: "hello world" }, // 11 chars
  });
  assert.equal(n, 11);
});

test("elevenlabs: counts code points, not UTF-16 units (emoji)", () => {
  // "a😀b" is 3 code points but 4 UTF-16 units; ElevenLabs bills per character.
  const n = extractUnits("elevenlabs", { requestBody: { text: "a😀b" } });
  assert.equal(n, 3);
});

test("elevenlabs: prefers a usage header over request text", () => {
  const headers = new Headers({ "character-cost": "42" });
  const n = extractUnits("elevenlabs", {
    requestBody: { text: "hello world" },
    responseHeaders: headers,
  });
  assert.equal(n, 42);
});

test("elevenlabs: no text and no header -> 0", () => {
  assert.equal(extractUnits("elevenlabs", { requestBody: {} }), 0);
});

// --- Legacy "llm" auto-detect ----------------------------------------------
test("llm: auto-detects anthropic shape", () => {
  const n = extractUnits("llm", {
    responseBody: { usage: { input_tokens: 3, output_tokens: 4 } },
  });
  assert.equal(n, 7);
});

test("llm: auto-detects openai shape", () => {
  const n = extractUnits("llm", {
    responseBody: { usage: { total_tokens: 9 } },
  });
  assert.equal(n, 9);
});

// --- Generic + unknown fallback --------------------------------------------
test("generic provider yields 0 (billed per-call upstream)", () => {
  assert.equal(extractUnits("generic", { responseBody: { usage: { total_tokens: 5 } } }), 0);
});

test("unknown provider falls back to llm auto-detect (never silently 0)", () => {
  const n = extractUnits("mystery-api", {
    responseBody: { usage: { total_tokens: 11 } },
  });
  assert.equal(n, 11);
});

// --- Deprecated shim keeps the old signature working ------------------------
test("extractTokens shim still reads a response body", () => {
  assert.equal(extractTokens({ usage: { total_tokens: 21 } }, "llm"), 21);
  assert.equal(extractTokens({ usage: { total_tokens: 21 } }, "generic"), 0);
});

// --- Billing math -----------------------------------------------------------
test("calculateCost: per-million-units, fixed 8 dp", () => {
  // 500k tokens at $2/M = $1.00000000
  assert.equal(calculateCost(500_000, "2"), "1.00000000");
});

test("calculateRevenue: per-million-units, fixed 8 dp", () => {
  // 250k units at $8/M = $2.00000000
  assert.equal(calculateRevenue(250_000, "8"), "2.00000000");
});

test("billing: zero units -> zero money", () => {
  assert.equal(calculateCost(0, "5"), "0.00000000");
  assert.equal(calculateRevenue(0, "5"), "0.00000000");
});

test("billing: margin example stays positive at a markup", () => {
  const units = 1_000_000;
  const cost = parseFloat(calculateCost(units, "3")); // $3
  const revenue = parseFloat(calculateRevenue(units, "10")); // $10
  assert.equal((revenue - cost).toFixed(8), "7.00000000");
});
