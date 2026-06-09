"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Revokes a sub-key via DELETE /api/reseller/subkeys?id=... Revocation is
// soft (sets active=false); the gateway honors it once the 60s SubKeyMeta cache
// TTL lapses, so the key may keep working briefly — surfaced in the confirm copy.
export function RevokeKeyButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function revoke() {
    setLoading(true);
    const res = await fetch(`/api/subkeys?id=${id}`, {
      method: "DELETE",
    });
    setLoading(false);
    setConfirming(false);
    if (res.ok) router.refresh();
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">Revoke? (active up to ~60s more)</span>
        <button
          type="button"
          onClick={revoke}
          disabled={loading}
          className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="px-2 py-1 rounded border hover:bg-gray-50"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs text-red-600 hover:underline"
    >
      Revoke
    </button>
  );
}
