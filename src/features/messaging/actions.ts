"use server";
import { comAtor } from "@/lib/actions/helpers";
import { enviarMensagem, marcarLidas } from "@/server/services/acompanhamento";

export async function sendMessage(patientId: string, texto: string) { return comAtor(async (a) => { await enviarMensagem(a, patientId, texto); return {}; }); }
export async function markRead(ids: string[]) { return comAtor(async (a) => ({ lidas: await marcarLidas(a, ids) })); }
