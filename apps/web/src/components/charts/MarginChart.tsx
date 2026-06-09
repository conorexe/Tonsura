"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailyMargin } from "@tonsura/db";

interface Props {
  data: DailyMargin[];
}

export function MarginChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => `$${v.toFixed(4)}`} />
        <Area
          type="monotone"
          dataKey="margin"
          stroke="#16a34a"
          fill="#dcfce7"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
