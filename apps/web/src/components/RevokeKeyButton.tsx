"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RevokeKeyButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function revoke() {
    setLoading(true);
    const res = await fetch(`/api/subkeys?id=${id}`, { method: "DELETE" });
    setLoading(false);
    setConfirming(false);
    if (res.ok) router.refresh();
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={revoke}
          disabled={loading}
          className="text-red-600 hover:underline disabled:opacity-50"
        >
          {loading ? "..." : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-gray-500 hover:underline"
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
      className="text-xs text-gray-500 hover:text-red-600 hover:underline"
    >
      Revoke
    </button>
  );
}
