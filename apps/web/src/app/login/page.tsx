"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      setError("Wrong password.");
      setLoading(false);
      return;
    }

    router.push("/app/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border p-8 w-full max-w-sm space-y-4"
      >
        <div>
          <h1 className="text-2xl font-bold">Tonsura</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter the admin password to continue.
          </p>
        </div>
        <input
          type="password"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
