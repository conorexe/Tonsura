import type { ProviderSpend, Provider } from "@tonsura/db";

// Spend per root API (upstream provider). usage_logs stores provider_id; the
// human name lives in the providers table, so resolve it here for display.
export interface ProviderSpendRow {
  providerId: string;
  name: string;
  cost: number;
  revenue: number;
  margin: number;
  requests: number;
}

export function providerSpendRows(
  spend: ProviderSpend[],
  providers: Provider[]
): ProviderSpendRow[] {
  const nameById = new Map(providers.map((p) => [p.id, p.name]));
  return spend.map((s) => ({
    providerId: s.providerId,
    name: nameById.get(s.providerId) ?? `${s.providerId.slice(0, 8)}…`,
    cost: s.cost,
    revenue: s.revenue,
    margin: s.margin,
    requests: s.requests,
  }));
}
