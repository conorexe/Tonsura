import { getDb } from "@/lib/db";
import {
  spendByFeature,
  spendByProvider,
  marginByPlan,
  usageByUser,
  listActiveProviders,
} from "@tonsura/db";
import { providerSpendRows } from "@/lib/insights";
import { FeatureSpendChart } from "@/components/charts/FeatureSpendChart";

export const dynamic = "force-dynamic";

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function InsightsPage() {
  const db = getDb();
  const [features, providerSpend, plans, users, providerList] =
    await Promise.all([
      spendByFeature(db, 30),
      spendByProvider(db, 30),
      marginByPlan(db, 30),
      usageByUser(db, { limit: 8, days: 30 }),
      listActiveProviders(db),
    ]);
  const providers = providerSpendRows(providerSpend, providerList);

  const totalCost = features.reduce((s, f) => s + f.cost, 0);
  const totalRevenue = features.reduce((s, f) => s + f.revenue, 0);
  const totalMargin = totalRevenue - totalCost;
  const topFeature = features[0];

  const stats = [
    { label: "Spend (30d)", value: usd(totalCost) },
    { label: "Revenue (30d)", value: usd(totalRevenue) },
    {
      label: "Margin (30d)",
      value: usd(totalMargin),
      accent: totalMargin >= 0 ? "text-green-700" : "text-red-600",
    },
    { label: "Top cost driver", value: topFeature?.feature || "—" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-sm text-gray-500 mt-1">
          Where your API spend goes — by feature, root API, end-user, and tier.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.accent ?? ""}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          Spend by feature (30d)
        </h2>
        {features.length === 0 ? (
          <p className="text-sm text-gray-500">
            No usage yet. Proxy a call through the gateway or send a pixel
            event and it shows up here.
          </p>
        ) : (
          <FeatureSpendChart data={features} />
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b font-medium text-sm">
          Spend by root API (30d)
        </div>
        <div className="divide-y">
          <div className="px-4 py-2 grid grid-cols-6 text-xs text-gray-400 uppercase tracking-wide">
            <span className="col-span-2">Root API</span>
            <span className="text-right">Requests</span>
            <span className="text-right">Cost</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">Margin</span>
          </div>
          {providers.length === 0 && (
            <p className="px-4 py-4 text-sm text-gray-500">No usage yet.</p>
          )}
          {providers.map((p) => (
            <div
              key={p.providerId}
              className="px-4 py-2 grid grid-cols-6 text-sm items-center"
            >
              <span className="col-span-2 font-medium">{p.name}</span>
              <span className="text-right tabular-nums">
                {p.requests.toLocaleString()}
              </span>
              <span className="text-right tabular-nums">{usd(p.cost)}</span>
              <span className="text-right tabular-nums">{usd(p.revenue)}</span>
              <span
                className={`text-right tabular-nums font-medium ${p.margin >= 0 ? "text-green-700" : "text-red-600"}`}
              >
                {usd(p.margin)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b font-medium text-sm">
          Margin by tier (30d)
        </div>
        <div className="divide-y">
          <div className="px-4 py-2 grid grid-cols-6 text-xs text-gray-400 uppercase tracking-wide">
            <span>Tier</span>
            <span className="text-right">Users</span>
            <span className="text-right">Requests</span>
            <span className="text-right">Cost</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">Margin</span>
          </div>
          {plans.length === 0 && (
            <p className="px-4 py-4 text-sm text-gray-500">
              No usage yet. Tag calls with X-Tonsura-Plan (proxy) or plan
              (pixel) to split margin per tier.
            </p>
          )}
          {plans.map((t) => (
            <div
              key={t.plan || "(untagged)"}
              className="px-4 py-2 grid grid-cols-6 text-sm items-center"
            >
              <span className="font-medium capitalize">
                {t.plan || "(untagged)"}
              </span>
              <span className="text-right tabular-nums">{t.users}</span>
              <span className="text-right tabular-nums">
                {t.requests.toLocaleString()}
              </span>
              <span className="text-right tabular-nums">{usd(t.cost)}</span>
              <span className="text-right tabular-nums">{usd(t.revenue)}</span>
              <span
                className={`text-right tabular-nums font-medium ${t.margin >= 0 ? "text-green-700" : "text-red-600"}`}
              >
                {usd(t.margin)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b font-medium text-sm">
          Spend by end-user (30d)
        </div>
        <div className="divide-y">
          <div className="px-4 py-2 grid grid-cols-6 text-xs text-gray-400 uppercase tracking-wide">
            <span className="col-span-2">End user</span>
            <span className="text-right">Features</span>
            <span className="text-right">Requests</span>
            <span className="text-right">Cost</span>
            <span className="text-right">Margin</span>
          </div>
          {users.length === 0 && (
            <p className="px-4 py-4 text-sm text-gray-500">
              No attributed traffic yet. Send X-Tonsura-User on proxy calls or
              endUser on pixel events to split spend per user.
            </p>
          )}
          {users.map((u) => (
            <div
              key={u.endUser}
              className="px-4 py-2 grid grid-cols-6 text-sm items-center"
            >
              <span className="col-span-2 font-mono text-xs truncate">
                {u.endUser}
              </span>
              <span className="text-right tabular-nums">{u.features}</span>
              <span className="text-right tabular-nums">
                {u.requests.toLocaleString()}
              </span>
              <span className="text-right tabular-nums">{usd(u.cost)}</span>
              <span
                className={`text-right tabular-nums font-medium ${u.margin >= 0 ? "text-green-700" : "text-red-600"}`}
              >
                {usd(u.margin)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
