import { getDb } from "@/lib/db";
import { listProjects, listProducts } from "@tonsura/db";
import { CreateFeatureForm } from "@/components/CreateFeatureForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  const db = getDb();
  const [projects, products] = await Promise.all([
    listProjects(db),
    listProducts(db),
  ]);

  // Group products under their feature so each card shows its alias-routed
  // bindings (the upstreams a feature key for this feature can reach).
  const productsByProject = new Map<string, typeof products>();
  for (const p of products) {
    if (!p.projectId) continue;
    const list = productsByProject.get(p.projectId) ?? [];
    list.push(p);
    productsByProject.set(p.projectId, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Features</h1>
        <p className="text-sm text-gray-500 mt-1">
          A feature groups one or more root APIs. Issue a single{" "}
          <Link href="/app/keys" className="text-blue-600 hover:underline">
            feature key
          </Link>{" "}
          and the gateway routes{" "}
          <code className="text-xs">/v1/&#123;alias&#125;/…</code> to the right
          upstream by each product&apos;s path alias.
        </p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-medium">New feature</h2>
        <CreateFeatureForm />
      </div>

      <div className="space-y-4">
        {projects.length === 0 && (
          <p className="bg-white rounded-xl border p-6 text-gray-500 text-sm">
            No features yet. Create one above, then add products with a path
            alias to bind root APIs into it.
          </p>
        )}
        {projects.map((proj) => {
          const bindings = productsByProject.get(proj.id) ?? [];
          return (
            <div key={proj.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{proj.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{proj.slug}</p>
                </div>
                <Link
                  href="/app/products/new"
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Add product
                </Link>
              </div>
              {bindings.length === 0 ? (
                <p className="mt-3 text-sm text-amber-600">
                  No products bound yet. Add a product to this feature with a
                  path alias to make it routable.
                </p>
              ) : (
                <ul className="mt-3 divide-y border-t">
                  {bindings.map((b) => (
                    <li
                      key={b.id}
                      className="py-2 flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">{b.name}</span>
                      <span className="flex items-center gap-3">
                        {b.pathAlias ? (
                          <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            /v1/{b.pathAlias}/…
                          </code>
                        ) : (
                          <span className="text-xs text-amber-600">
                            no alias — not routable
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {b.unitType}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
