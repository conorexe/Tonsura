import { getDb } from "@/lib/db";
import { listProducts } from "@tonsura/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const db = getDb();
  const products = await listProducts(db);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link
          href="/app/products/new"
          className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
        >
          + New Product
        </Link>
      </div>
      <div className="bg-white rounded-xl border divide-y">
        {products.length === 0 && (
          <p className="p-6 text-gray-500 text-sm">
            No products yet. A product binds an upstream API key to a unit
            price so usage can be metered.
          </p>
        )}
        {products.map((p) => (
          <div key={p.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">
                {p.name}
                {p.pathAlias && (
                  <code className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                    /v1/{p.pathAlias}/…
                  </code>
                )}
              </p>
              <p className="text-sm text-gray-500">
                Price: ${p.pricePerMillionTokens}/M {p.unitType}s · Cost: $
                {p.costPerMillionTokens}/M {p.unitType}s
              </p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
            >
              {p.active ? "Active" : "Inactive"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
