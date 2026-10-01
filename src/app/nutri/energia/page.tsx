"use client";
import { useMemo, useState } from "react";
import { calculateEnergy } from "@/lib/clinical/energy/calculate";
import { macrosByPercent } from "@/lib/clinical/macronutrients/macros";
import { BMR_META, type BmrEquation } from "@/lib/clinical/energy/bmr";
import { ACTIVITY_FACTORS, type ActivityLevel } from "@/lib/clinical/energy/expenditure";

const EQ = (Object.keys(BMR_META) as BmrEquation[]);
export default function Energia() {
  const [eq, setEq] = useState<BmrEquation>("mifflin");
  const [level, setLevel] = useState<ActivityLevel>("moderate");
  const [pct, setPct] = useState(-10);
  const [sex, setSex] = useState<"male" | "female">("female");
  const f = "mt-1 w-full rounded-lg border border-mist bg-white p-2";
  const res = useMemo(() => {
    try { const r = calculateEnergy({ sex, weightKg: 66.9, heightCm: 168, age: 34, leanMassKg: 50, equation: eq, method: { type: "factor", level }, strategy: { type: "percent", value: pct } });
      return { r, m: macrosByPercent(r.outputs.vet, { protein: 30, carbohydrate: 45, fat: 25 }) }; }
    catch (e) { return { error: (e as Error).message }; }
  }, [eq, level, pct, sex]);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Gasto energético</h1>
      <div className="grid gap-3 sm:grid-cols-4">
        <label>Equação<select className={f} value={eq} onChange={(e) => setEq(e.target.value as BmrEquation)}>{EQ.map((k) => <option key={k} value={k}>{BMR_META[k].name}</option>)}</select></label>
        <label>Sexo<select className={f} value={sex} onChange={(e) => setSex(e.target.value as "male" | "female")}><option value="female">Feminino</option><option value="male">Masculino</option></select></label>
        <label>Atividade<select className={f} value={level} onChange={(e) => setLevel(e.target.value as ActivityLevel)}>{Object.entries(ACTIVITY_FACTORS).map(([k, v]) => <option key={k} value={k}>{k} ({v})</option>)}</select></label>
        <label>Estratégia (%)<input type="number" className={f} value={pct} onChange={(e) => setPct(Number(e.target.value))} /></label>
      </div>
      {"error" in res ? <p role="alert" className="font-medium text-amber-700">{res.error}</p> :
        <dl className="rounded-xl border border-mist bg-white p-4"><div>TMB {Math.round(res.r.outputs.tmb)} kcal · GET {Math.round(res.r.outputs.get)} kcal · VET {Math.round(res.r.outputs.vet)} kcal</div>
          <div className="text-sm text-graphite/70">{res.r.outputs.methodology} · {res.r.outputs.reference}</div>
          <div>P {Math.round(res.m.protein_g)} g · C {Math.round(res.m.carbohydrate_g)} g · G {Math.round(res.m.fat_g)} g · {res.m.coherent ? "coerente com o VET" : "incoerente com o VET"}</div></dl>}
    </section>
  );
}
