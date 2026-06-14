import { AccountMenu } from "@/components/AccountMenu";
import Link from "next/link";

const nav: { href: string; label: string }[] = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/insights", label: "Insights" },
  { href: "/app/analytics", label: "Analytics" },
  { href: "/app/providers", label: "API keys" },
  { href: "/app/features", label: "Features" },
  { href: "/app/products", label: "Products" },
  { href: "/app/keys", label: "Issued keys" },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-52 border-r border-gray-200 px-3 py-5 flex flex-col">
        <div className="px-2 mb-5 text-sm font-semibold tracking-tight">
          tonsura
        </div>
        <nav className="flex flex-col gap-px">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-2 py-1.5 rounded text-[13px] text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <AccountMenu />
      </aside>
      <main className="flex-1 px-10 py-8 max-w-5xl">{children}</main>
    </div>
  );
}
