"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { FeatureSpend } from "@tonsura/db";

interface Props {
  data: FeatureSpend[];
}

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
];

export function FeatureSpendChart({ data }: Props) {
  const formatted = data.map((d) => ({
    feature: d.feature || "(none)",
    cost: d.cost,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} layout="vertical" margin={{ left: 24 }}>
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="feature"
          tick={{ fontSize: 12 }}
          width={110}
        />
        <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
        <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
          {formatted.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
