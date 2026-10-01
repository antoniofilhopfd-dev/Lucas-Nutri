"use client";
import { useState } from "react";
import { foodTotals, mealTotals, dayTotals, type Per100 } from "@/features/diets/nutrition";
import { canTransition, isEditable, type DietStatus } from "@/features/diets/lifecycle";

// Valores de exemplo para demonstração. A base real (ex.: TACO) entra via importação com fonte e licença.
const FOODS: Record<string, Per100> = { "Arroz cozido (exemplo)": { calories: 130, protein: 2.5, carbohydrate: 28, fat: 0.2, fiber: 1.6 }, "Frango grelhado (exemplo)": { calories: 165, protein: 31, carbohydrate: 0, fat: 3.6, fiber: 0 } };
export default function Dietas() {
  const [status, setStatus] = useState<DietStatus>("draft");
  const [qty, setQty] = useState<Record<string, number>>({ "Arroz cozido (exemplo)": 180, "Frango grelhado (exemplo)": 150 });
  const meal = mealTotals(Object.entries(FOODS).map(([n, per100]) => ({ per100, quantity: qty[n] })));
  const day = dayTotals([meal]);
  const next: DietStatus[] = ["reviewed", "finalized", "published"];
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Dieta <span className="text-base text-graphite/60">· {status}</span></h1>
      {Object.keys(FOODS).map((n) => <label key={n} className="block">{n} (g)
        <input type="number" disabled={!isEditable(status)} className="ml-2 w-24 rounded border border-mist p-1" value={qty[n]} onChange={(e) => setQty({ ...qty, [n]: Number(e.target.value) })} />
        <span className="ml-2 text-sm text-graphite/60">{Math.round(foodTotals(FOODS[n], qty[n]).calories)} kcal</span></label>)}
      <p>Almoço: {Math.round(meal.calories)} kcal · P {meal.protein.toFixed(1)} g · C {meal.carbohydrate.toFixed(1)} g · G {meal.fat.toFixed(1)} g · Fibra {meal.fiber.toFixed(1)} g</p>
      <p>Dia: {Math.round(day.calories)} kcal</p>
      {next.filter((s) => canTransition(status, s)).map((s) => <button key={s} className="rounded-lg bg-olive px-4 py-2 text-white" onClick={() => setStatus(s)}>Avançar para {s}</button>)}
    </section>
  );
}
