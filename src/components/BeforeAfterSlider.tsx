"use client";
import { useState } from "react";
/** Sobreposição sincronizada: o controle revela "depois" sobre "antes". */
export function BeforeAfterSlider({ before, after, label }: { before: string; after: string; label: string }) {
  const [pos, setPos] = useState(50);
  return (
    <figure className="max-w-sm">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-mist">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={`${label} — inicial`} className="absolute inset-0 h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt={`${label} — retorno`} className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} />
        <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} />
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm">Antes
        <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} aria-label={`Comparar ${label}: antes e depois`} className="flex-1" />Depois</label>
    </figure>
  );
}
