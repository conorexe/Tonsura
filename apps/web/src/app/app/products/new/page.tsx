"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TransformEditor } from "@/components/transform/TransformEditor";
import type { TransformConfig } from "@tonsura/validators";

interface FeatureOption {
  id: string;
  name: string;
  slug: string;
}

const input =
  "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black";
const label = "block text-[11px] uppercase tracking-wider text-gray-500 mb-1";

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    masterKeyId: "",
    projectId: "",
    name: "",
    slug: "",
    pathAlias: "",
    description: "",
    pricePerMillionTokens: "",
    costPerMillionTokens: "",
    defaultRpmLimit: 60,
    defaultRpdLimit: 1000,
  });
  const [features, setFeatures] = useState<FeatureOption[]>([]);
  const [transformConfig, setTransformConfig] =
    useState<TransformConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: FeatureOption[]) => setFeatures(rows))
      .catch(() => setFeatures([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      ...form,
      projectId: form.projectId || undefined,
      pathAlias: form.pathAlias || undefined,
      transformConfig,
    };

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError("Path alias must be unique within its feature.");
      setLoading(false);
      return;
    }

    router.push("/app/products");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      <h1 className="text-base font-semibold">New product</h1>

      <section className="space-y-4">
        <div>
          <label className={label}>Master key ID</label>
          <input
            className={`${input} font-mono`}
            value={form.masterKeyId}
            onChange={(e) => setForm({ ...form, masterKeyId: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Name</label>
            <input
              className={input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={label}>Slug</label>
            <input
              className={input}
              placeholder="claude-3-5-sonnet"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Feature</label>
            <select
              className={input}
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            >
              <option value="">Standalone</option>
              {features.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>
              Path alias{form.projectId ? " (required)" : ""}
            </label>
            <input
              className={input}
              placeholder="chat"
              value={form.pathAlias}
              onChange={(e) =>
                setForm({
                  ...form,
                  pathAlias: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, ""),
                })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Price / 1M units ($)</label>
            <input
              className={input}
              placeholder="20.00"
              value={form.pricePerMillionTokens}
              onChange={(e) =>
                setForm({ ...form, pricePerMillionTokens: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className={label}>Cost / 1M units ($)</label>
            <input
              className={input}
              placeholder="15.00"
              value={form.costPerMillionTokens}
              onChange={(e) =>
                setForm({ ...form, costPerMillionTokens: e.target.value })
              }
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>RPM</label>
            <input
              type="number"
              className={input}
              value={form.defaultRpmLimit}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultRpmLimit: parseInt(e.target.value, 10),
                })
              }
            />
          </div>
          <div>
            <label className={label}>RPD</label>
            <input
              type="number"
              className={input}
              value={form.defaultRpdLimit}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultRpdLimit: parseInt(e.target.value, 10),
                })
              }
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3">Transforms</h2>
        <TransformEditor
          value={transformConfig}
          onChange={setTransformConfig}
          providerType="llm"
        />
      </section>

      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-black text-white px-5 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Creating" : "Create product"}
      </button>
    </form>
  );
}
