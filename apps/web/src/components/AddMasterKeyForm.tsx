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

const input =
  "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black";
const label = "block text-[11px] uppercase tracking-wider text-gray-500 mb-1";

export function AddMasterKeyForm({ providers }: Props) {
  const router = useRouter();
  const [providerId, setProviderId] = useState(providers[0]?.id ?? CUSTOM);
  const [labelText, setLabel] = useState("");
  const [plainKey, setPlainKey] = useState("");

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
          label: labelText,
          plainKey,
          customProvider: {
            name: custName,
            baseUrl,
            type: custType,
            authScheme,
            authParam: authScheme === "bearer" ? undefined : authParam,
          },
        }
      : { providerId, label: labelText, plainKey };

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
          : "Failed. Check the base URL and try again."
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
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Provider</label>
          <select
            className={input}
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value={CUSTOM}>Custom</option>
          </select>
        </div>
        <div>
          <label className={label}>Label</label>
          <input
            className={input}
            placeholder="production"
            value={labelText}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
      </div>

      {isCustom && (
        <div className="border-l-2 border-gray-200 pl-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Name</label>
              <input
                className={input}
                placeholder="Stripe, my-svc"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                required={isCustom}
              />
            </div>
            <div>
              <label className={label}>Base URL</label>
              <input
                type="url"
                className={`${input} font-mono`}
                placeholder="https://api.example.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                required={isCustom}
              />
            </div>
          </div>
          <div>
            <label className={label}>Metering</label>
            <select
              className={input}
              value={custType}
              onChange={(e) => setCustType(e.target.value as ProviderType)}
            >
              <option value="generic">Per request</option>
              <option value="openai">OpenAI tokens</option>
              <option value="anthropic">Anthropic tokens</option>
              <option value="elevenlabs">ElevenLabs characters</option>
              <option value="llm">Auto-detect LLM tokens</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Auth</label>
              <select
                className={input}
                value={authScheme}
                onChange={(e) => setAuthScheme(e.target.value as AuthScheme)}
              >
                <option value="bearer">Bearer</option>
                <option value="header">Header</option>
                <option value="query">Query param</option>
              </select>
            </div>
            {authScheme !== "bearer" && (
              <div>
                <label className={label}>
                  {authScheme === "header" ? "Header name" : "Param name"}
                </label>
                <input
                  className={`${input} font-mono`}
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
        <label className={label}>Key</label>
        <input
          type="password"
          className={`${input} font-mono`}
          placeholder="sk-..."
          value={plainKey}
          onChange={(e) => setPlainKey(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-black text-white px-5 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Adding" : "Add key"}
      </button>
    </form>
  );
}
