"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { parsePlanRows, parseCsv, PLAN_COLUMNS, TEMPLATE_CSV, type PlanParse } from "@/features/diets/plan-import";
import { createDiet } from "@/features/diets/actions";

async function readFile(file: File): Promise<unknown[][]> {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  if (/\.xlsx$/i.test(file.name)) { const { readSheet } = await import("read-excel-file/browser"); return (await readSheet(file)) as unknown[][]; }
  throw new Error("Formato não suportado. Envie .xlsx ou .csv (no Excel antigo, use Salvar como → .xlsx).");
}
export default function ImportarPlano() {
  const q = useSearchParams(); const patientId = q.get("paciente") ?? "", consultationId = q.get("consulta") ?? "";
  const [res, setRes] = useState<PlanParse | null>(null); const [vet, setVet] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const field = "mt-1 rounded-lg border border-mist bg-white p-2";
  return (
    <section className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Importar plano alimentar</h1>
      <p className="text-sm text-graphite/70">Planilha com as colunas <b>{PLAN_COLUMNS.join(" · ")}</b>. Cada linha é uma opção da refeição; refeição e horário em branco herdam a linha de cima. O plano entra como rascunho.</p>
      <a className="text-olive underline" href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`} download="modelo-plano-alimentar.csv">Baixar modelo</a>
      {(!patientId || !consultationId) && <p role="alert" className="text-red-700">Abra esta tela a partir de uma consulta (faltam paciente e consulta na URL).</p>}
      <label className="block">Arquivo (.xlsx ou .csv)<input type="file" accept=".xlsx,.csv" className={`${field} block`} onChange={async (e) => {
        const f = e.target.files?.[0]; setMsg(""); setRes(null); if (!f) return;
        try { setRes(parsePlanRows(await readFile(f))); } catch (err) { setMsg(err instanceof Error ? err.message : "Não foi possível ler o arquivo."); }
      }} /></label>
      <label className="block">VET (kcal), opcional<input type="number" className={`${field} ml-2 w-28`} value={vet} onChange={(e) => setVet(e.target.value)} /></label>
      {res?.errors.length ? <ul role="alert" className="list-disc pl-5 text-red-700">{res.errors.map((e, i) => <li key={i}>Linha {e.row}: {e.message}</li>)}</ul> : null}
      {res && res.meals.length > 0 && <table className="w-full text-sm"><thead><tr className="text-left"><th>Refeição</th><th>Horário</th><th>Itens</th></tr></thead>
        <tbody>{res.meals.map((m, i) => <tr key={i} className="border-t border-mist align-top"><td className="pr-2">{m.name}</td><td className="pr-2">{m.time ?? "—"}</td><td>{m.notes}</td></tr>)}</tbody></table>}
      {msg && <p role="alert" className="text-red-700">{msg}</p>}
      <button disabled={busy || !res?.meals.length || !!res.errors.length || !patientId || !consultationId} className="rounded-lg bg-olive px-4 py-2 text-white disabled:opacity-50" onClick={async () => {
        if (!res) return; setBusy(true); const r = await createDiet(patientId, consultationId, res.meals, vet ? Number(vet) : undefined); setBusy(false);
        setMsg(r.ok ? "Plano importado como rascunho." : r.message);
      }}>Importar como rascunho</button>
    </section>
  );
}
