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

  // Load the reseller's features so a product can be bound into one (and become
  // alias-routable for feature keys). Optional — a product with no feature stays
  // a legacy standalone product.
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
      // Send only when set — both are optional server-side.
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
      setError(
        "Failed to create product. A path alias must be unique within its feature."
      );
      setLoading(false);
      return;
    }

    router.push("/app/products");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">New Product</h1>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-medium">Details</h2>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Master Key ID (UUID)"
          value={form.masterKeyId}
          onChange={(e) => setForm({ ...form, masterKeyId: e.target.value })}
          required
        />
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Product Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Slug (e.g. claude-3-5-sonnet)"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Feature (optional)
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.projectId}
              onChange={(e) =>
                setForm({ ...form, projectId: e.target.value })
              }
            >
              <option value="">— Standalone (no feature) —</option>
              {features.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Path alias {form.projectId ? "(required for routing)" : "(optional)"}
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. chat or tts"
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
        {form.projectId && (
          <p className="text-xs text-gray-500 -mt-2">
            Feature-key calls to{" "}
            <code className="bg-gray-100 px-1 rounded">
              /v1/{form.pathAlias || "{alias}"}/…
            </code>{" "}
            route to this product&apos;s upstream.
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Your price / 1M tokens ($)
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. 20.00"
              value={form.pricePerMillionTokens}
              onChange={(e) =>
                setForm({ ...form, pricePerMillionTokens: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Provider cost / 1M tokens ($)
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. 15.00"
              value={form.costPerMillionTokens}
              onChange={(e) =>
                setForm({ ...form, costPerMillionTokens: e.target.value })
              }
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Default RPM limit
            </label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
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
            <label className="block text-xs text-gray-500 mb-1">
              Default RPD limit
            </label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
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
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-medium">Transformation Rules</h2>
        <p className="text-sm text-gray-500">
          Optionally modify requests and responses before they reach the upstream
          provider.
        </p>
        <TransformEditor
          value={transformConfig}
          onChange={setTransformConfig}
          providerType="llm"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
}
