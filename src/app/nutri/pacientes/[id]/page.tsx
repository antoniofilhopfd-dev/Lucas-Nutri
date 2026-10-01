import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ageAt } from "@/lib/utils/age";
import { classifyBmi } from "@/lib/clinical/classifications/bmi";

export const dynamic = "force-dynamic";
const TABS = ["resumo", "anamnese", "avaliacao", "fotometria", "energia", "dieta", "checkins", "mensagens"] as const;

export default async function Prontuario({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  // RLS decide: paciente fora da carteira simplesmente não aparece (404).
  const { data: p } = await sb.from("patients").select("id, birth_date, primary_goal, profiles(full_name)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [cons, ass, en, diet] = await Promise.all([
    sb.from("consultations").select("id, consultation_type, status, record_state, scheduled_at").eq("patient_id", id).order("scheduled_at", { ascending: false, nullsFirst: false }).limit(5),
    sb.from("anthropometric_assessments").select("assessment_date, weight_kg, bmi").eq("patient_id", id).order("assessment_date", { ascending: false }).limit(2),
    sb.from("energy_calculations").select("equation, equation_version, outputs, created_at").eq("patient_id", id).order("created_at", { ascending: false }).limit(1),
    sb.from("diets").select("version, status, vet_kcal").eq("patient_id", id).order("version", { ascending: false }).limit(1),
  ]);
  const name = (p as any).profiles?.full_name ?? "—";
  const last = ass.data?.[0]; const prev = ass.data?.[1]; const e = en.data?.[0]; const d = diet.data?.[0];
  return (
    <section className="space-y-4">
      <div><h1 className="text-2xl font-semibold">{name}</h1>
        <p className="text-sm text-graphite/70">{ageAt(p.birth_date, new Date().toISOString().slice(0, 10))} anos · {p.primary_goal ?? "objetivo não informado"}</p></div>
      <nav aria-label="Prontuário" className="flex gap-1 overflow-x-auto border-b border-mist">{TABS.map((t) => <Link key={t} href={`?tab=${t}`} className="px-3 py-2 capitalize text-graphite/70">{t}</Link>)}</nav>
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-mist bg-white p-4"><h2 className="font-medium">Última avaliação</h2>
          {last ? <p>{last.weight_kg} kg · IMC {Number(last.bmi).toFixed(1)} ({classifyBmi(Number(last.bmi))}){prev && <span className="text-sm text-graphite/70"> · Δ {(last.weight_kg - prev.weight_kg).toFixed(1)} kg</span>}</p> : <p className="text-graphite/70">Nenhuma avaliação registrada.</p>}</article>
        <article className="rounded-xl border border-mist bg-white p-4"><h2 className="font-medium">Gasto energético</h2>
          {e ? <p>VET {Math.round((e.outputs as any).vet)} kcal · {e.equation} v{e.equation_version}</p> : <p className="text-graphite/70">Nenhum cálculo registrado.</p>}</article>
        <article className="rounded-xl border border-mist bg-white p-4"><h2 className="font-medium">Dieta</h2>
          {d ? <p>v{d.version} · {d.status}{d.vet_kcal ? ` · ${Math.round(d.vet_kcal)} kcal` : ""}</p> : <p className="text-graphite/70">Nenhuma dieta criada.</p>}</article>
        <article className="rounded-xl border border-mist bg-white p-4"><h2 className="font-medium">Consultas recentes</h2>
          {cons.data?.length ? <ul>{cons.data.map((c) => <li key={c.id}>{c.consultation_type} · {c.status} · {c.record_state}</li>)}</ul> : <p className="text-graphite/70">Nenhuma consulta.</p>}</article>
      </div>
    </section>
  );
}
