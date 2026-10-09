"use client";
import { useMemo, useState } from "react";
import { assess } from "@/lib/clinical/assess";
import { round1 } from "@/lib/clinical/anthropometry/indices";
import { PROTOCOLS } from "@/lib/clinical/skinfolds/protocols";

export default function Avaliacao() {
  const [v, setV] = useState({ weight: 66.9, height: 168, waist: 75.5, hip: 98, r: 32.1, l: 31.4 });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Number(e.target.value) });
  const r: any = useMemo(() => { try { return assess({ weightKg: v.weight, heightCm: v.height, waistCm: v.waist, hipCm: v.hip, pairs: { biceps_relaxed: { right: v.r, left: v.l } } }); } catch { return null; } }, [v]);
  const f = "mt-1 w-full rounded-lg border border-mist bg-white p-2";
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Avaliação física</h1>
      <div className="grid gap-3">
        {([["weight", "Peso (kg)"], ["height", "Altura (cm)"], ["waist", "Cintura (cm)"], ["hip", "Quadril (cm)"], ["r", "Bíceps relaxado D (cm)"], ["l", "Bíceps relaxado E (cm)"]] as const).map(([k, t]) =>
          <label key={k}>{t}<input type="number" step="0.1" className={f} value={v[k]} onChange={set(k)} /></label>)}
      </div>
      {r ? <dl className="rounded-xl border border-mist bg-white p-4">
        <div>IMC: {round1(r.bmi)} · {r.bmi_class} <span className="text-sm text-graphite/60">({r.classification_source})</span></div>
        <div>RCQ: {r.waist_hip_ratio.toFixed(2)} · RCEst: {r.waist_height_ratio.toFixed(2)}</div>
        <div>Assimetria bíceps: {round1(r.asymmetry.biceps_relaxed)} cm</div></dl> : <p role="alert">Preencha valores válidos.</p>}
      <div className="rounded-xl border border-mist p-4">
        <h2 className="font-medium">Plicometria</h2>
        <ul className="mt-2 text-sm">{Object.values(PROTOCOLS).map((p) => <li key={p.id}>{p.name}: <b className="text-amber-700">REVISÃO CIENTÍFICA NECESSÁRIA</b> (bloqueado)</li>)}</ul>
      </div>
    </section>
  );
}
