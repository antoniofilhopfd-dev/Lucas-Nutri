import { EvolutionChart } from "@/components/EvolutionChart";
import { change } from "@/features/analytics/series";
import { buildAlerts, sortAlerts } from "@/features/analytics/alerts";

// Dados de exemplo; em produção vêm de nutritionist_dashboard() e das views com RLS.
const weight = [{ date: "11/08", value: 68.4 }, { date: "20/09", value: 67.5 }, { date: "11/10", value: 66.9 }];
export default function Dashboard() {
  const c = change(weight)!;
  const alerts = sortAlerts(buildAlerts({ id: "1", name: "Joana Alves", lastRecordAt: new Date(Date.now() - 80 * 3.6e6), adherence7d: 41 }));
  return (
    <section className="space-y-4"><h1 className="text-2xl font-semibold">Dashboard</h1>
      <EvolutionChart data={weight} label="Peso" unit="kg" />
      <p>Variação: {c.abs.toFixed(1)} kg ({c.pct?.toFixed(1)}%)</p>
      <ul>{alerts.map((a) => <li key={a.code} className={a.severity === "critical" ? "text-red-700" : "text-amber-700"}>{a.message}</li>)}</ul></section>
  );
}
