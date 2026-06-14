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
    <div className="space-y-10">
      <h1 className="text-base font-semibold">Issued keys</h1>

      <section>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <th className="font-normal py-2">Label</th>
              <th className="font-normal py-2">Feature</th>
              <th className="font-normal py-2 text-right">Limits</th>
              <th className="font-normal py-2 text-right">Status</th>
              <th className="font-normal py-2 text-right w-20"></th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-gray-500">
                  No keys issued.
                </td>
              </tr>
            )}
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-gray-100">
                <td className="py-2.5">{k.label || "(unlabeled)"}</td>
                <td className="py-2.5 text-gray-600">
                  {k.projectId
                    ? (featureName.get(k.projectId) ?? "")
                    : "(single product)"}
                </td>
                <td className="py-2.5 text-right text-gray-600 tabular-nums">
                  {k.rpmLimit}/min &nbsp;·&nbsp; {k.rpdLimit}/day
                </td>
                <td className="py-2.5 text-right">
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${k.active ? "bg-emerald-500" : "bg-gray-300"}`}
                    />
                    {k.active ? "Active" : "Revoked"}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  {k.active && <RevokeKeyButton id={k.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-4">New feature key</h2>
        <CreateFeatureKeyForm features={featureOptions} />
      </section>
    </div>
  );
}
