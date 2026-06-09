import { getDb } from "@/lib/db";
import { listProjects, listSubKeys } from "@tonsura/db";
import { CreateFeatureKeyForm } from "@/components/CreateFeatureKeyForm";
import { RevokeKeyButton } from "@/components/RevokeKeyButton";

export const dynamic = "force-dynamic";

export default async function KeysPage() {
  const db = getDb();
  const [projects, keys] = await Promise.all([
    listProjects(db),
    listSubKeys(db),
  ]);

  const featureOptions = projects.map((p) => ({ id: p.id, label: p.name }));
  const featureName = new Map(projects.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Keys</h1>
        <p className="text-sm text-gray-500 mt-1">
          A feature key authorizes every product in a feature. Your app calls{" "}
          <code className="text-xs">/v1/&#123;alias&#125;/…</code> and the
          gateway picks the upstream by path alias, stamping the feature on
          usage automatically.
        </p>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-medium mb-4">New feature key</h2>
        <CreateFeatureKeyForm features={featureOptions} />
      </div>

      <div className="bg-white rounded-xl border divide-y">
        <div className="p-4 text-sm font-medium text-gray-500">Issued keys</div>
        {keys.length === 0 && (
          <p className="p-6 text-gray-500 text-sm">No keys issued yet.</p>
        )}
        {keys.map((k) => (
          <div key={k.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">
                {k.label || "(unlabeled)"}
                {k.projectId && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    feature
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500">
                {k.projectId
                  ? `Feature: ${featureName.get(k.projectId) ?? "—"}`
                  : "Single-product key"}
                {" · "}
                {k.rpmLimit} rpm / {k.rpdLimit} rpd
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs px-2 py-1 rounded-full ${k.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
              >
                {k.active ? "Active" : "Revoked"}
              </span>
              {k.active && <RevokeKeyButton id={k.id} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
