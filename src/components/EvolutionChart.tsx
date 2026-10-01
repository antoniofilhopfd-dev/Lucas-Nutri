"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Point } from "@/features/analytics/series";
export function EvolutionChart({ data, label, unit }: { data: Point[]; label: string; unit: string }) {
  return (
    <figure aria-label={`Evolução de ${label}`}>
      <div className="h-56 w-full"><ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#ECEBE6" /><XAxis dataKey="date" tick={{ fontSize: 12 }} /><YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} width={40} />
          <Tooltip formatter={(v) => [`${Number(v).toLocaleString("pt-BR")} ${unit}`, label]} />
          <Line type="monotone" dataKey="value" stroke="#4F6B4A" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart></ResponsiveContainer></div>
      <figcaption className="text-sm text-graphite/70">{label} ({unit})</figcaption>
    </figure>
  );
}
