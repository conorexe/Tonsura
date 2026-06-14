"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const input =
  "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black";

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
      setError("Slug may already be in use.");
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
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 max-w-xl">
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">
          Name
        </label>
        <input
          className={input}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(slugify(e.target.value));
          }}
          required
        />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">
          Slug
        </label>
        <input
          className={input}
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugEdited(true);
          }}
          pattern="[a-z0-9-]+"
          required
        />
      </div>
      <div className="col-span-2">
        <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">
          Description
        </label>
        <input
          className={input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {error && <p className="col-span-2 text-red-600 text-xs">{error}</p>}
      <div className="col-span-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-5 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Creating" : "Create feature"}
        </button>
      </div>
    </form>
  );
}
