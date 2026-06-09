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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">API Keys</h1>
      <p className="text-sm text-gray-500">
        Connect your upstream API credentials. Keys are encrypted at rest.
      </p>
      <div className="bg-white rounded-xl border divide-y">
        {keys.length === 0 && (
          <p className="p-6 text-gray-500 text-sm">No keys connected yet.</p>
        )}
        {keys.map((k) => (
          <div key={k.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{k.label}</p>
              <p className="text-xs text-gray-400 font-mono">{k.id}</p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${k.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
            >
              {k.active ? "Active" : "Revoked"}
            </span>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-medium mb-4">Add API Key</h2>
        <AddMasterKeyForm providers={providers} />
      </div>
    </div>
  );
}
