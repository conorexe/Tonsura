import { AccountMenu } from "@/components/AccountMenu";
import Link from "next/link";

// Auth is enforced by src/middleware.ts (session cookie) — no per-layout gate.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r bg-white p-4 flex flex-col gap-1">
        <div className="font-bold text-lg mb-4">Tonsura</div>
        <NavLink href="/app/dashboard">Dashboard</NavLink>
        <NavLink href="/app/insights">Insights</NavLink>
        <NavLink href="/app/providers">API Keys</NavLink>
        <NavLink href="/app/features">Features</NavLink>
        <NavLink href="/app/products">Products</NavLink>
        <NavLink href="/app/keys">Keys</NavLink>
        <NavLink href="/app/analytics">Analytics</NavLink>
        <AccountMenu />
      </aside>
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm"
    >
      {children}
    </Link>
  );
}
