import { notFound } from "next/navigation";
import { exigirUsuario } from "@/server/auth";
import { obterPaciente } from "@/server/services/pacientes";
import { resumoClinico } from "@/server/services/avaliacoes";
import { lerDietas } from "@/server/services/dietas";
import { AcessoNegado } from "@/server/authz";
import { dataISO } from "@/server/sql";
import { ageAt } from "@/lib/utils/age";
import { classifyBmi } from "@/lib/clinical/classifications/bmi";
import { CodigoAcesso } from "./CodigoAcesso";

export const dynamic = "force-dynamic";
const TIPO: Record<string, string> = { initial: "Inicial", follow_up: "Retorno", reassessment: "Reavaliação", online: "Online" };
export default async function Prontuario({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await exigirUsuario(["nutritionist", "admin"]);
  const a = { id: u.id, papel: u.papel };
  let p: Record<string, any>;
  try { p = await obterPaciente(a, id); } catch (e) { if (e instanceof AcessoNegado) notFound(); throw e; } // sem acesso = 404 (não revela que existe)
  const [r, dietas] = await Promise.all([resumoClinico(a, id), lerDietas(a, id)]);
  const [ult, ant] = r.avaliacoes, d = dietas[0];
  return (
    <section className="space-y-4">
      <div><h1 className="text-2xl font-semibold">{p.nome}</h1>
        <p className="text-sm text-graphite/70">{ageAt(dataISO(p.birth_date), new Date().toISOString().slice(0, 10))} anos · {p.primary_goal ?? "objetivo não informado"}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-mist bg-white p-4"><h2 className="font-medium">Última avaliação</h2>
          {ult ? <p>{Number(ult.weight_kg)} kg · IMC {Number(ult.bmi).toFixed(1)} ({classifyBmi(Number(ult.bmi))}){ant && <span className="text-sm text-graphite/70"> · Δ {(Number(ult.weight_kg) - Number(ant.weight_kg)).toFixed(1)} kg</span>}</p> : <p className="text-graphite/70">Nenhuma avaliação registrada.</p>}</article>
        <article className="rounded-xl border border-mist bg-white p-4"><h2 className="font-medium">Gasto energético</h2>
          {r.energia ? <p>VET {Math.round((typeof r.energia.outputs === "string" ? JSON.parse(r.energia.outputs) : (r.energia.outputs as any)).vet)} kcal · {r.energia.equation} v{r.energia.equation_version}</p> : <p className="text-graphite/70">Nenhum cálculo registrado.</p>}</article>
        <article className="rounded-xl border border-mist bg-white p-4"><h2 className="font-medium">Dieta</h2>
          {d ? <p>v{d.version} · {d.status}{d.vet_kcal ? ` · ${Math.round(Number(d.vet_kcal))} kcal` : ""}</p> : <p className="text-graphite/70">Nenhuma dieta criada.</p>}</article>
        <article className="rounded-xl border border-mist bg-white p-4"><h2 className="font-medium">Consultas recentes</h2>
          {r.consultas.length ? <ul>{r.consultas.map((c) => <li key={c.id}>{TIPO[c.consultation_type]} · {c.status} · {c.record_state}</li>)}</ul> : <p className="text-graphite/70">Nenhuma consulta.</p>}</article>
      </div>
      <CodigoAcesso patientId={id} telefone={p.phone} />
    </section>
  );
}
