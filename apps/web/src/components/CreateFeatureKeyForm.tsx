"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Option {
  id: string;
  label: string;
}

const input =
  "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black";
const label = "block text-[11px] uppercase tracking-wider text-gray-500 mb-1";

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
          "Failed. Ensure the feature has at least one aliased product."
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
      <div className="max-w-xl space-y-3">
        <p className="text-sm">Created. Copy it now, it won&apos;t be shown again.</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 border border-gray-300 px-3 py-2 text-xs font-mono break-all">
            {plainKey}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(plainKey);
              setCopied(true);
            }}
            className="px-3 py-2 bg-black text-white text-sm hover:bg-gray-800"
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
          className="text-xs text-gray-600 hover:underline"
        >
          Create another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 max-w-xl">
      {disabled && (
        <p className="col-span-2 text-xs text-amber-700">
          Create a feature with at least one aliased product first.
        </p>
      )}
      <div>
        <label className={label}>Feature</label>
        <select
          className={input}
          value={form.projectId}
          onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          required
        >
          <option value="">Select</option>
          {features.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={label}>Label</label>
        <input
          className={input}
          placeholder="production"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
      </div>
      <div>
        <label className={label}>RPM</label>
        <input
          type="number"
          min={1}
          className={input}
          value={form.rpmLimit}
          onChange={(e) =>
            setForm({ ...form, rpmLimit: parseInt(e.target.value, 10) || 1 })
          }
        />
      </div>
      <div>
        <label className={label}>RPD</label>
        <input
          type="number"
          min={1}
          className={input}
          value={form.rpdLimit}
          onChange={(e) =>
            setForm({ ...form, rpdLimit: parseInt(e.target.value, 10) || 1 })
          }
        />
      </div>
      {error && <p className="col-span-2 text-red-600 text-xs">{error}</p>}
      <div className="col-span-2">
        <button
          type="submit"
          disabled={loading || disabled}
          className="bg-black text-white px-5 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Creating" : "Create key"}
        </button>
      </div>
    </form>
  );
}
