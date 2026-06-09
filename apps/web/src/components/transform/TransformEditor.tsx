"use client";

import { useState } from "react";
import type { TransformConfig } from "@tonsura/validators";

interface Props {
  value: TransformConfig | null;
  onChange: (config: TransformConfig | null) => void;
  providerType?: "llm" | "generic";
}

type Tab = "prompt" | "request" | "response";

export function TransformEditor({ value, onChange, providerType }: Props) {
  const [tab, setTab] = useState<Tab>(providerType === "llm" ? "prompt" : "request");
  const req = value?.request ?? {};
  const res = value?.response ?? {};

  function updateRequest(patch: Partial<TransformConfig["request"]>) {
    onChange({ ...value, request: { ...req, ...patch } });
  }

  function updateResponse(patch: Partial<TransformConfig["response"]>) {
    onChange({ ...value, response: { ...res, ...patch } });
  }

  const tabs: Tab[] = providerType === "llm"
    ? ["prompt", "request", "response"]
    : ["request", "response"];

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="flex border-b bg-gray-50">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize ${tab === t ? "border-b-2 border-black font-medium" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t === "prompt" ? "Prompt Injection" : t}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {tab === "prompt" && (
          <>
            <Field
              label="System Prompt"
              description="Injected as the system role before all user messages."
            >
              <textarea
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                value={req.systemPrompt ?? ""}
                onChange={(e) => updateRequest({ systemPrompt: e.target.value || undefined })}
                placeholder="You are a helpful assistant specialised in..."
              />
            </Field>
            <Field label="Prompt Prefix" description="Prepended to the last user message.">
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={req.promptPrefix ?? ""}
                onChange={(e) => updateRequest({ promptPrefix: e.target.value || undefined })}
              />
            </Field>
            <Field label="Prompt Suffix" description="Appended to the last user message.">
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={req.promptSuffix ?? ""}
                onChange={(e) => updateRequest({ promptSuffix: e.target.value || undefined })}
              />
            </Field>
          </>
        )}

        {tab === "request" && (
          <>
            <Field
              label="Remove Fields"
              description="Comma-separated field names to strip from the request body."
            >
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={(req.removeFields ?? []).join(", ")}
                onChange={(e) =>
                  updateRequest({
                    removeFields: e.target.value
                      ? e.target.value.split(",").map((s) => s.trim())
                      : undefined,
                  })
                }
                placeholder="e.g. stream, user"
              />
            </Field>
            <Field
              label="Add Headers (JSON)"
              description="Extra headers to inject on every upstream request."
            >
              <textarea
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                value={req.addHeaders ? JSON.stringify(req.addHeaders, null, 2) : ""}
                onChange={(e) => {
                  try {
                    updateRequest({ addHeaders: e.target.value ? JSON.parse(e.target.value) : undefined });
                  } catch { /* ignore invalid JSON while typing */ }
                }}
                placeholder='{"X-Custom-Header": "value"}'
              />
            </Field>
          </>
        )}

        {tab === "response" && (
          <Field
            label="Remove Fields"
            description="Comma-separated field names to strip from the response body."
          >
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={(res.removeFields ?? []).join(", ")}
              onChange={(e) =>
                updateResponse({
                  removeFields: e.target.value
                    ? e.target.value.split(",").map((s) => s.trim())
                    : undefined,
                })
              }
              placeholder="e.g. system_fingerprint"
            />
          </Field>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      {children}
    </div>
  );
}
