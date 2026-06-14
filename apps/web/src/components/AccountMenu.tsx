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
    <button
      onClick={logout}
      className="mt-auto text-left px-2 py-1.5 rounded text-[13px] text-gray-500 hover:bg-gray-100 hover:text-black"
    >
      Sign out
    </button>
  );
}
