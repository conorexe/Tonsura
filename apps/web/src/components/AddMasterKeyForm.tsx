"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Provider } from "@tonsura/db";

interface Props {
  providers: Provider[];
}

const CUSTOM = "__custom__";

type AuthScheme = "bearer" | "header" | "query";
type ProviderType = "generic" | "llm" | "openai" | "anthropic" | "elevenlabs";

export function AddMasterKeyForm({ providers }: Props) {
  const router = useRouter();
  const [providerId, setProviderId] = useState(providers[0]?.id ?? CUSTOM);
  const [label, setLabel] = useState("");
  const [plainKey, setPlainKey] = useState("");

  // Custom-provider fields, only used when providerId === CUSTOM.
  const [custName, setCustName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [custType, setCustType] = useState<ProviderType>("generic");
  const [authScheme, setAuthScheme] = useState<AuthScheme>("bearer");
  const [authParam, setAuthParam] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isCustom = providerId === CUSTOM;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body = isCustom
      ? {
          label,
          plainKey,
          customProvider: {
            name: custName,
            baseUrl,
            type: custType,
            authScheme,
            authParam: authScheme === "bearer" ? undefined : authParam,
          },
        }
      : { providerId, label, plainKey };

    const res = await fetch("/api/master-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: unknown }
        | null;
      setError(
        typeof data?.error === "string"
          ? data.error
          : "Failed to add key. Check the base URL and try again."
      );
      setLoading(false);
      return;
    }

    router.refresh();
    setLabel("");
    setPlainKey("");
    setCustName("");
    setBaseUrl("");
    setAuthParam("");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Provider</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value={CUSTOM}>+ Custom API…</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Label</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="My production key"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
      </div>

      {isCustom && (
        <div className="rounded-lg border border-dashed p-4 space-y-4 bg-gray-50">
          <p className="text-xs text-gray-500">
            Connect any API on any platform. Tonsura proxies requests to your
            base URL and attaches the key the way the API expects.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                API name
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Stripe, OpenAI, my-internal-svc…"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                required={isCustom}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Base URL
              </label>
              <input
                type="url"
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="https://api.example.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                required={isCustom}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Usage metering
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={custType}
              onChange={(e) => setCustType(e.target.value as ProviderType)}
            >
              <option value="generic">Generic — bill per request</option>
              <option value="openai">OpenAI — tokens from response usage</option>
              <option value="anthropic">
                Anthropic — tokens from response usage
              </option>
              <option value="elevenlabs">
                ElevenLabs — characters from request text
              </option>
              <option value="llm">Other LLM — auto-detect token usage</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Auth method
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={authScheme}
                onChange={(e) => setAuthScheme(e.target.value as AuthScheme)}
              >
                <option value="bearer">Authorization: Bearer</option>
                <option value="header">Custom header</option>
                <option value="query">Query parameter</option>
              </select>
            </div>
            {authScheme !== "bearer" && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {authScheme === "header" ? "Header name" : "Query param name"}
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder={authScheme === "header" ? "x-api-key" : "api_key"}
                  value={authParam}
                  onChange={(e) => setAuthParam(e.target.value)}
                  required={isCustom}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs text-gray-500 mb-1">API Key</label>
        <input
          type="password"
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
          placeholder="sk-…"
          value={plainKey}
          onChange={(e) => setPlainKey(e.target.value)}
          required
        />
        <p className="text-xs text-gray-400 mt-1">
          Encrypted with AES-256-GCM before storage. Not recoverable.
        </p>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Key"}
      </button>
    </form>
  );
}
