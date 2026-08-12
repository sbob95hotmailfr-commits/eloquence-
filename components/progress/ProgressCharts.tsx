"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

export function ProgressLineChart({ data }: { data: { date: string; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey="date" stroke="var(--foreground)" fontSize={12} />
        <YAxis domain={[0, 10]} stroke="var(--foreground)" fontSize={12} />
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}
        />
        <Line type="monotone" dataKey="score" stroke="var(--color-laiton)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CompetenceRadar({ data }: { data: { critere: string; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="var(--border-subtle)" />
        <PolarAngleAxis dataKey="critere" stroke="var(--foreground)" fontSize={12} />
        <PolarRadiusAxis domain={[0, 10]} stroke="var(--foreground)" fontSize={10} />
        <Radar dataKey="score" stroke="var(--color-laiton)" fill="var(--color-laiton)" fillOpacity={0.35} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
