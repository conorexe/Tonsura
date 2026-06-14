import { getDb } from "@/lib/db";
import { listMasterKeys, listActiveProviders } from "@tonsura/db";
import { AddMasterKeyForm } from "@/components/AddMasterKeyForm";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const db = getDb();
  const [keys, providers] = await Promise.all([
    listMasterKeys(db),
    listActiveProviders(db),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-base font-semibold">API keys</h1>

      <section>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <th className="font-normal py-2">Label</th>
              <th className="font-normal py-2">ID</th>
              <th className="font-normal py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-gray-500">
                  No keys yet.
                </td>
              </tr>
            )}
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-gray-100">
                <td className="py-2.5">{k.label}</td>
                <td className="py-2.5 font-mono text-xs text-gray-500">
                  {k.id}
                </td>
                <td className="py-2.5 text-right">
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${k.active ? "bg-emerald-500" : "bg-gray-300"}`}
                    />
                    {k.active ? "Active" : "Revoked"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-4">Add key</h2>
        <AddMasterKeyForm providers={providers} />
      </section>
    </div>
  );
}
