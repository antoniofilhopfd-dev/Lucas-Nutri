"use server";
import { comAtor } from "@/lib/actions/helpers";
import { criarDieta, avancarDieta, atualizarDieta, type RefeicaoEntrada } from "@/server/services/dietas";
import type { DietStatus } from "./lifecycle";

export async function createDiet(consultationId: string, meals: RefeicaoEntrada[], vetKcal?: number) { return comAtor((a) => criarDieta(a, consultationId, { meals, vetKcal })); }
export async function updateDiet(dietId: string, meals: RefeicaoEntrada[], vetKcal?: number) { return comAtor(async (a) => { await atualizarDieta(a, dietId, { meals, vetKcal }); return {}; }); }
export async function advanceDiet(id: string, to: Exclude<DietStatus, "draft" | "superseded">) { return comAtor(async (a) => { await avancarDieta(a, id, to); return {}; }); }
