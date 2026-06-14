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
  `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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
    { label: "Spend", value: usd(totalCost) },
    { label: "Revenue", value: usd(totalRevenue) },
    {
      label: "Margin",
      value: usd(totalMargin),
      negative: totalMargin < 0,
    },
    { label: "Top feature", value: topFeature?.feature || "" },
  ];

  return (
    <div className="space-y-10">
      <h1 className="text-base font-semibold">Insights</h1>

      <div className="grid grid-cols-4 border-y border-gray-200 divide-x divide-gray-200">
        {stats.map((s) => (
          <div key={s.label} className="py-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-gray-500">
              {s.label}
            </p>
            <p
              className={`text-lg font-medium mt-1 tabular-nums ${s.negative ? "text-red-600" : ""}`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-medium">Spend by feature</h2>
          <span className="text-xs text-gray-500">Last 30 days</span>
        </div>
        {features.length === 0 ? (
          <p className="text-sm text-gray-500">No usage yet.</p>
        ) : (
          <FeatureSpendChart data={features} />
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3">Spend by root API</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <th className="font-normal py-2">API</th>
              <th className="font-normal py-2 text-right">Requests</th>
              <th className="font-normal py-2 text-right">Cost</th>
              <th className="font-normal py-2 text-right">Revenue</th>
              <th className="font-normal py-2 text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-gray-500">
                  No usage yet.
                </td>
              </tr>
            )}
            {providers.map((p) => (
              <tr key={p.providerId} className="border-b border-gray-100">
                <td className="py-2.5">{p.name}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {p.requests.toLocaleString()}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {usd(p.cost)}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {usd(p.revenue)}
                </td>
                <td
                  className={`py-2.5 text-right tabular-nums ${p.margin < 0 ? "text-red-600" : ""}`}
                >
                  {usd(p.margin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3">Margin by tier</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <th className="font-normal py-2">Tier</th>
              <th className="font-normal py-2 text-right">Users</th>
              <th className="font-normal py-2 text-right">Requests</th>
              <th className="font-normal py-2 text-right">Cost</th>
              <th className="font-normal py-2 text-right">Revenue</th>
              <th className="font-normal py-2 text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-gray-500">
                  No tiered usage.
                </td>
              </tr>
            )}
            {plans.map((t) => (
              <tr
                key={t.plan || "(untagged)"}
                className="border-b border-gray-100"
              >
                <td className="py-2.5 capitalize">{t.plan || "(untagged)"}</td>
                <td className="py-2.5 text-right tabular-nums">{t.users}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {t.requests.toLocaleString()}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {usd(t.cost)}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {usd(t.revenue)}
                </td>
                <td
                  className={`py-2.5 text-right tabular-nums ${t.margin < 0 ? "text-red-600" : ""}`}
                >
                  {usd(t.margin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3">Spend by end user</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <th className="font-normal py-2">User</th>
              <th className="font-normal py-2 text-right">Features</th>
              <th className="font-normal py-2 text-right">Requests</th>
              <th className="font-normal py-2 text-right">Cost</th>
              <th className="font-normal py-2 text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-gray-500">
                  No attributed users.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.endUser} className="border-b border-gray-100">
                <td className="py-2.5 font-mono text-xs truncate max-w-[16rem]">
                  {u.endUser}
                </td>
                <td className="py-2.5 text-right tabular-nums">{u.features}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {u.requests.toLocaleString()}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {usd(u.cost)}
                </td>
                <td
                  className={`py-2.5 text-right tabular-nums ${u.margin < 0 ? "text-red-600" : ""}`}
                >
                  {usd(u.margin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
