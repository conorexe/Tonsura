"use client";

import { useRouter } from "next/navigation";

export function AccountMenu() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mt-auto pt-4 border-t">
      <button
        onClick={logout}
        className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-black"
      >
        Sign out
      </button>
    </div>
  );
}
