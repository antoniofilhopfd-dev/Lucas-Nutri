"use client";
import { useMemo, useState } from "react";
import { PLAN_COLUMNS, parseCsv } from "@/features/diets/plan-import";
import { parseWorkbook, type Metas, type Workbook } from "@/features/diets/plan-workbook";
import { createDiet, importFoods } from "@/features/diets/actions";

type Props = { patients: { id: string; name: string }[]; consultations: { id: string; patientId: string; label: string }[]; initialPatient?: string; initialConsultation?: string };
const EMPTY: Metas = { vet: "", protein: "", carb: "", fat: "", water: "" };
async function readFile(file: File) {
  if (/\.csv$/i.test(file.name)) return [{ name: "Plano", rows: parseCsv(await file.text()) as unknown[][] }];
  if (/\.xlsx$/i.test(file.name)) { const { default: read } = await import("read-excel-file/browser"); return (await read(file)).map((s: any) => ({ name: s.sheet as string, rows: s.data as unknown[][] })); }
  throw new Error("Formato não suportado. Envie .xlsx ou .csv (no Excel antigo, use Salvar como → .xlsx).");
}
const metasNote = (m: Metas) => {
  const p = [m.vet && `VET ${m.vet} kcal`, m.protein && `Proteínas ${m.protein} g`, m.carb && `Carboidratos ${m.carb} g`, m.fat && `Lipídeos ${m.fat} g`, m.water && `Água ${m.water} L/dia`].filter(Boolean);
  return p.length ? `Metas diárias: ${p.join(" | ")}` : undefined;
};
export function ImportarForm({ patients, consultations, initialPatient, initialConsultation }: Props) {
  const [patientId, setPatientId] = useState(initialPatient ?? ""); const [consultationId, setConsultationId] = useState(initialConsultation ?? "");
  const [wb, setWb] = useState<Workbook | null>(null); const [m, setM] = useState<Metas>(EMPTY); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const field = "mt-1 w-full rounded-lg border border-mist bg-white p-2";
  const opts = useMemo(() => consultations.filter((c) => c.patientId === patientId), [consultations, patientId]);
  const planOk = !!wb?.plan?.meals.length && !wb.plan.errors.length;
  return (
    <section className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Importar planilha</h1>
      <p className="text-sm text-graphite/70">Abas: <b>Plano</b> ({PLAN_COLUMNS.join(" · ")}), <b>Alimentos</b> e <b>Metas</b> (as duas últimas são opcionais). O plano entra como rascunho.</p>
      <a className="text-olive underline" href="/modelos/modelo-plano-alimentar.xlsx" download>Baixar modelo de planilha (.xlsx)</a>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">Paciente<select className={field} value={patientId} onChange={(e) => { setPatientId(e.target.value); setConsultationId(""); }}><option value="">Selecione</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="block">Consulta<select className={field} value={consultationId} disabled={!patientId} onChange={(e) => setConsultationId(e.target.value)}><option value="">Selecione</option>{opts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
      </div>
      {patientId && !opts.length && <p className="text-sm text-graphite/70">Este paciente não tem consulta em aberto. Crie uma em Consultas.</p>}
      <label className="block">Arquivo (.xlsx ou .csv)<input type="file" accept=".xlsx,.csv" className={`${field} block`} onChange={async (e) => {
        const f = e.target.files?.[0]; setMsg(""); setWb(null); if (!f) return;
        try { const r = parseWorkbook(await readFile(f)); setWb(r); if (r.metas) setM({ ...EMPTY, ...r.metas }); } catch (err) { setMsg(err instanceof Error ? err.message : "Não foi possível ler o arquivo."); }
      }} /></label>
      {wb && <div className="rounded-2xl border border-mist p-4"><h2 className="text-xs font-semibold uppercase text-graphite/70">Metas do plano</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3">
          {([["vet", "VET (kcal)", ""], ["protein", "Proteínas (g)", "4"], ["carb", "Carboidratos (g)", "4"], ["fat", "Lipídeos (g)", "9"], ["water", "Água (L/dia)", ""]] as const).map(([k, label, kcal]) => (
            <label key={k} className="block text-sm">{label}<input type="number" step="any" className={field} value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} />
              {kcal && Number(m.vet) > 0 && Number(m[k]) > 0 && <span className="text-xs text-graphite/60">{Math.round((Number(m[k]) * Number(kcal) * 100) / Number(m.vet))}% do VET</span>}</label>))}
        </div></div>}
      {wb?.plan?.errors.length ? <ul role="alert" className="list-disc pl-5 text-red-700">{wb.plan.errors.map((e, i) => <li key={i}>Plano, linha {e.row}: {e.message}</li>)}</ul> : null}
      {wb?.plan?.meals.length ? <table className="w-full text-sm"><thead><tr className="text-left"><th>Refeição</th><th>Horário</th><th>Itens</th></tr></thead>
        <tbody>{wb.plan.meals.map((x, i) => <tr key={i} className="border-t border-mist align-top"><td className="pr-2">{x.name}</td><td className="pr-2">{x.time ?? "—"}</td><td>{x.notes}</td></tr>)}</tbody></table> : null}
      {wb?.foods && <div>
        <p className="text-sm">Alimentos: {wb.foods.ok.length} válidos, {wb.foods.errors.length} com erro.</p>
        {wb.foods.errors.length ? <ul role="alert" className="list-disc pl-5 text-red-700">{wb.foods.errors.map((e, i) => <li key={i}>Alimentos, linha {e.row}: {e.message}</li>)}</ul> : null}
        <button disabled={busy || !wb.foods.ok.length || !!wb.foods.errors.length} className="mt-2 rounded-lg border border-olive px-4 py-2 text-olive disabled:opacity-50" onClick={async () => {
          setBusy(true); const r = await importFoods(wb.foods!.ok as unknown as Record<string, unknown>[]); setBusy(false); setMsg(r.ok ? `${r.count} alimentos importados.` : r.message);
        }}>Importar alimentos</button></div>}
      {msg && <p role="status" className="text-graphite">{msg}</p>}
      <button disabled={busy || !planOk || !patientId || !consultationId} className="rounded-lg bg-olive px-4 py-2 text-white disabled:opacity-50" onClick={async () => {
        setBusy(true); const r = await createDiet(patientId, consultationId, wb!.plan!.meals, m.vet ? Number(m.vet) : undefined, metasNote(m)); setBusy(false);
        setMsg(r.ok ? "Plano importado como rascunho." : r.message);
      }}>Importar plano como rascunho</button>
    </section>
  );
}
