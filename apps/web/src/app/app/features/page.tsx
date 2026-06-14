import { getDb } from "@/lib/db";
import { listProjects, listProducts } from "@tonsura/db";
import { CreateFeatureForm } from "@/components/CreateFeatureForm";

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  const db = getDb();
  const [projects, products] = await Promise.all([
    listProjects(db),
    listProducts(db),
  ]);

  const productsByProject = new Map<string, typeof products>();
  for (const p of products) {
    if (!p.projectId) continue;
    const list = productsByProject.get(p.projectId) ?? [];
    list.push(p);
    productsByProject.set(p.projectId, list);
  }

  return (
    <div className="space-y-10">
      <h1 className="text-base font-semibold">Features</h1>

      <section className="space-y-6">
        {projects.length === 0 && (
          <p className="text-gray-500 text-sm">No features yet.</p>
        )}
        {projects.map((proj) => {
          const bindings = productsByProject.get(proj.id) ?? [];
          return (
            <div
              key={proj.id}
              className="border-b border-gray-200 pb-5 last:border-b-0"
            >
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">{proj.name}</p>
                <span className="text-xs text-gray-500 font-mono">
                  {proj.slug}
                </span>
              </div>
              {bindings.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">
                  No products bound.
                </p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {bindings.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{b.name}</span>
                      <span className="flex items-center gap-3 text-xs text-gray-500">
                        {b.pathAlias ? (
                          <code className="font-mono">/v1/{b.pathAlias}</code>
                        ) : (
                          <span>no alias</span>
                        )}
                        <span>{b.unitType}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="text-sm font-medium mb-4">New feature</h2>
        <CreateFeatureForm />
      </section>
    </div>
  );
}
