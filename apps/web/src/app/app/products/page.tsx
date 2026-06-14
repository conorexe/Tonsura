import { getDb } from "@/lib/db";
import { listProducts } from "@tonsura/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const db = getDb();
  const products = await listProducts(db);

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-base font-semibold">Products</h1>
        <Link
          href="/app/products/new"
          className="text-sm text-black hover:underline"
        >
          + New product
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
            <th className="font-normal py-2">Name</th>
            <th className="font-normal py-2">Alias</th>
            <th className="font-normal py-2 text-right">Price</th>
            <th className="font-normal py-2 text-right">Cost</th>
            <th className="font-normal py-2 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-gray-500">
                No products.
              </td>
            </tr>
          )}
          {products.map((p) => (
            <tr key={p.id} className="border-b border-gray-100">
              <td className="py-2.5">{p.name}</td>
              <td className="py-2.5 font-mono text-xs text-gray-600">
                {p.pathAlias ? `/v1/${p.pathAlias}` : ""}
              </td>
              <td className="py-2.5 text-right tabular-nums">
                ${p.pricePerMillionTokens}
                <span className="text-xs text-gray-500"> /M {p.unitType}</span>
              </td>
              <td className="py-2.5 text-right tabular-nums">
                ${p.costPerMillionTokens}
                <span className="text-xs text-gray-500"> /M {p.unitType}</span>
              </td>
              <td className="py-2.5 text-right">
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${p.active ? "bg-emerald-500" : "bg-gray-300"}`}
                  />
                  {p.active ? "Active" : "Inactive"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
