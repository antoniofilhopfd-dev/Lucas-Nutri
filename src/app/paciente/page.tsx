"use client";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { addWater, waterProgress, validateTraining } from "@/features/checkins/rules";

export default function PacienteHome() {
  const [ml, setMl] = useState(2500); const goal = 3000;
  const [trained, setTrained] = useState<boolean | null>(null);
  const w = waterProgress(ml, goal);
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-4">
      <header className="flex items-center justify-between"><h1 className="text-xl font-semibold">Bom dia</h1><Logo className="h-8" /></header>
      <section aria-label="Água" className="rounded-xl border border-mist bg-white p-4">
        <div className="flex gap-1" role="img" aria-label={`${w.filled} de ${w.blocks} blocos de água`}>{Array.from({ length: w.blocks }, (_, i) => <span key={i} className={`h-6 flex-1 rounded ${i < w.filled ? "bg-olive" : "bg-mist"}`} />)}</div>
        <div className="mt-3 flex items-center justify-between"><span>{ml.toLocaleString("pt-BR")} / {goal.toLocaleString("pt-BR")} ml</span>
          <button className="min-h-11 rounded-lg bg-olive px-4 text-white" onClick={() => setMl(addWater(ml, goal))}>+500 ml</button></div>
      </section>
      <section aria-label="Treino" className="rounded-xl border border-mist bg-white p-4">
        <p>Treinou hoje?</p>
        <div className="mt-2 flex gap-2"><button className="min-h-11 flex-1 rounded-lg border border-mist" onClick={() => setTrained(true)}>Sim</button><button className="min-h-11 flex-1 rounded-lg border border-mist" onClick={() => setTrained(false)}>Não</button></div>
        {trained && <p className="mt-2 text-sm text-graphite/70">{validateTraining({ trained: true }) ?? ""}</p>}
      </section>
    </main>
  );
}
