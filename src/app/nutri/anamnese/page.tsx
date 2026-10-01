"use client";
import { useState } from "react";
import { getExtractor } from "@/lib/ai/registry";
import type { ExtractedItem } from "@/lib/ai/types";
import { confirm, edit, reject, toPersist, pendingCount } from "@/features/anamnesis/review";

export default function Anamnese() {
  const [text, setText] = useState("");
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const upd = (id: string, fn: (i: ExtractedItem) => ExtractedItem) => setItems((l) => l.map((i) => (i.id === id ? fn(i) : i)));
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Anamnese inteligente</h1>
      <label className="block">Relato do paciente
        <textarea className="mt-1 w-full rounded-lg border border-mist bg-white p-2" rows={5} value={text} onChange={(e) => setText(e.target.value)} /></label>
      <button className="rounded-lg bg-olive px-4 py-2 text-white" onClick={async () => setItems(await getExtractor().extract(text, "text"))}>Extrair dados</button>
      {items.length > 0 && <div className="rounded-xl border border-mist bg-white p-4">
        <h2 className="font-medium">Dados extraídos da anamnese ({pendingCount(items)} aguardando)</h2>
        <ul className="mt-2 space-y-2">{items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-mist pb-2">
            <div><b>{i.field}:</b> {i.value} <span className="text-sm text-graphite/60">({i.status})</span><div className="text-xs text-graphite/60">origem: “{i.source.snippet}”</div></div>
            <div className="flex gap-1"><button onClick={() => { const v = window.prompt("Editar valor", i.value); if (v) upd(i.id, (x) => edit(x, v)); }}>Editar</button>
              <button onClick={() => upd(i.id, reject)}>Excluir</button><button onClick={() => upd(i.id, confirm)}>Confirmar</button></div></li>))}</ul>
        <p className="mt-3 text-sm">{toPersist(items).length} item(ns) serão salvos no prontuário. Nada é salvo sem confirmação.</p></div>}
    </section>
  );
}
