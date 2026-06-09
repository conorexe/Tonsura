import { test } from "node:test";
import assert from "node:assert/strict";
import type { BindingMeta, SubKeyMeta } from "@tonsura/validators";
import { selectBinding, resolveRoute, legacyBinding } from "./binding-router";

const UUID = "00000000-0000-0000-0000-000000000000";

function binding(alias: string | null, over: Partial<BindingMeta> = {}): BindingMeta {
  return {
    pathAlias: alias,
    productId: UUID,
    providerId: UUID,
    providerType: "openai",
    providerBaseUrl: "https://api.openai.com/v1",
    authScheme: "bearer",
    authParam: null,
    encryptedMasterKey: "enc",
    unitType: "token",
    pricePerMillionTokens: "10",
    costPerMillionTokens: "2",
    transformConfig: null,
    ...over,
  };
}

function meta(over: Partial<SubKeyMeta> = {}): SubKeyMeta {
  return {
    id: UUID,
    projectId: null,
    productId: UUID,
    providerId: UUID,
    providerType: "openai",
    providerBaseUrl: "https://api.openai.com/v1",
    authScheme: "bearer",
    authParam: null,
    encryptedMasterKey: "enc",
    rpmLimit: 60,
    rpdLimit: 1000,
    dailyTokenLimit: null,
    unitType: "token",
    pricePerMillionTokens: "10",
    costPerMillionTokens: "2",
    transformConfig: null,
    feature: "",
    bindings: [],
    ...over,
  };
}

// --- selectBinding (feature-key alias routing) ------------------------------
test("selectBinding: routes by alias and strips the alias segment", () => {
  const bindings = [
    binding("chat", { providerType: "openai" }),
    binding("tts", { providerType: "elevenlabs" }),
  ];
  const r = selectBinding(bindings, "/v1/chat/chat/completions");
  assert.ok(r);
  assert.equal(r!.binding.providerType, "openai");
  assert.equal(r!.upstreamPath, "/chat/completions");
});

test("selectBinding: picks the elevenlabs binding for its alias", () => {
  const bindings = [
    binding("chat", { providerType: "openai" }),
    binding("tts", { providerType: "elevenlabs" }),
  ];
  const r = selectBinding(bindings, "/v1/tts/text-to-speech/voice123");
  assert.ok(r);
  assert.equal(r!.binding.providerType, "elevenlabs");
  assert.equal(r!.upstreamPath, "/text-to-speech/voice123");
});

test("selectBinding: alias with no extra path forwards '/'", () => {
  const r = selectBinding([binding("chat")], "/v1/chat");
  assert.ok(r);
  assert.equal(r!.upstreamPath, "/");
});

test("selectBinding: unknown alias -> null (404)", () => {
  assert.equal(selectBinding([binding("chat")], "/v1/nope/x"), null);
});

test("selectBinding: malformed path (no alias) -> null", () => {
  assert.equal(selectBinding([binding("chat")], "/health"), null);
  assert.equal(selectBinding([binding("chat")], "/v1"), null);
});

// --- legacyBinding ----------------------------------------------------------
test("legacyBinding: lifts the top-level meta into a single binding", () => {
  const b = legacyBinding(meta({ providerBaseUrl: "https://api.example.com" }));
  assert.equal(b.pathAlias, null);
  assert.equal(b.providerBaseUrl, "https://api.example.com");
  assert.equal(b.unitType, "token");
});

// --- resolveRoute (unified) -------------------------------------------------
test("resolveRoute: legacy key forwards the full path unchanged", () => {
  const r = resolveRoute(meta(), "/v1/chat/completions");
  assert.ok(r);
  assert.equal(r!.upstreamPath, "/v1/chat/completions");
  assert.equal(r!.binding.pathAlias, null);
});

test("resolveRoute: feature key routes by alias", () => {
  const r = resolveRoute(
    meta({ bindings: [binding("tts", { providerType: "elevenlabs" })] }),
    "/v1/tts/text-to-speech/v1"
  );
  assert.ok(r);
  assert.equal(r!.binding.providerType, "elevenlabs");
  assert.equal(r!.upstreamPath, "/text-to-speech/v1");
});

test("resolveRoute: feature key with unknown alias -> null", () => {
  const r = resolveRoute(
    meta({ bindings: [binding("chat")] }),
    "/v1/missing/x"
  );
  assert.equal(r, null);
});
