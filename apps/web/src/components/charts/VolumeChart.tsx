"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { VolumePoint } from "@tonsura/db";

interface Props {
  data: VolumePoint[];
}

export function VolumeChart({ data }: Props) {
  const formatted = data.map((d) => ({
    hour: d.hour.slice(11, 16),
    requests: d.requests,
    errors: d.errors,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted}>
        <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="requests" fill="#3b82f6" />
        <Bar dataKey="errors" fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  );
}
