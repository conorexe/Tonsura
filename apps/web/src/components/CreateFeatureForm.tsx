"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Auto-slugify a feature name into a URL-safe slug as the user types, unless
// they've manually edited the slug field.
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateFeatureForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug: slug || slugify(name),
        description: description || undefined,
      }),
    });

    if (!res.ok) {
      setError("Failed to create feature. Slug may already be in use.");
      setLoading(false);
      return;
    }

    setName("");
    setSlug("");
    setSlugEdited(false);
    setDescription("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
      <input
        className="border rounded-lg px-3 py-2 text-sm"
        placeholder="Feature name (e.g. Voice Assistant)"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (!slugEdited) setSlug(slugify(e.target.value));
        }}
        required
      />
      <input
        className="border rounded-lg px-3 py-2 text-sm"
        placeholder="Slug (e.g. voice-assistant)"
        value={slug}
        onChange={(e) => {
          setSlug(e.target.value);
          setSlugEdited(true);
        }}
        pattern="[a-z0-9-]+"
        title="lowercase letters, numbers and hyphens only"
        required
      />
      <input
        className="col-span-2 border rounded-lg px-3 py-2 text-sm"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {error && <p className="col-span-2 text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="col-span-2 bg-black text-white py-2 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Feature"}
      </button>
    </form>
  );
}
