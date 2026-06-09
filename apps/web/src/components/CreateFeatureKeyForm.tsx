"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Option {
  id: string;
  label: string;
}

export function CreateFeatureKeyForm({ features }: { features: Option[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    projectId: "",
    label: "",
    rpmLimit: 60,
    rpdLimit: 1000,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plainKey, setPlainKey] = useState("");
  const [copied, setCopied] = useState(false);

  const disabled = features.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPlainKey("");

    const res = await fetch("/api/subkeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: form.projectId,
        label: form.label || undefined,
        rpmLimit: form.rpmLimit,
        rpdLimit: form.rpdLimit,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        data?.error?.toString?.() ??
          "Failed to create feature key. Ensure the feature has at least one aliased product."
      );
      setLoading(false);
      return;
    }

    setPlainKey(data.plainKey ?? "");
    setForm({ ...form, label: "" });
    setLoading(false);
    router.refresh();
  }

  if (plainKey) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-green-700">
          Feature key created. Copy it now — it won&apos;t be shown again.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono break-all bg-gray-50">
            {plainKey}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(plainKey);
              setCopied(true);
            }}
            className="px-3 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setPlainKey("");
            setCopied(false);
          }}
          className="text-sm text-blue-600 hover:underline"
        >
          Create another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {disabled && (
        <p className="text-sm text-amber-600">
          Create a feature (with at least one aliased product) first.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Feature</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            required
          >
            <option value="">— Select feature —</option>
            {features.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Label (optional)
          </label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="e.g. production"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">RPM limit</label>
          <input
            type="number"
            min={1}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.rpmLimit}
            onChange={(e) =>
              setForm({ ...form, rpmLimit: parseInt(e.target.value, 10) || 1 })
            }
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">RPD limit</label>
          <input
            type="number"
            min={1}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.rpdLimit}
            onChange={(e) =>
              setForm({ ...form, rpdLimit: parseInt(e.target.value, 10) || 1 })
            }
          />
        </div>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading || disabled}
        className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create feature key"}
      </button>
    </form>
  );
}
