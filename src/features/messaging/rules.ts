import { z } from "zod";
export const BADGES = ["good_consistency", "excellent_hydration", "workout_done", "good_choice", "consistent_week"] as const;
export const BADGE_LABEL: Record<(typeof BADGES)[number], string> = { good_consistency: "Boa consistência", excellent_hydration: "Excelente hidratação", workout_done: "Treino concluído", good_choice: "Boa escolha", consistent_week: "Semana consistente" };

export const messageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), body: z.string().trim().min(1, "Mensagem vazia").max(4000) }),
  z.object({ kind: z.literal("audio"), audio_path: z.string().min(3), duration_s: z.number().positive().max(300) }),
]);
export const feedbackSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), body: z.string().trim().min(1).max(1000) }),
  z.object({ kind: z.literal("audio"), audio_path: z.string().min(3) }),
  z.object({ kind: z.literal("badge"), badge: z.enum(BADGES) }),
]);
export const FEEDBACK_TARGETS = ["photo", "checkin", "meal"] as const;

/** Conversa privada: apenas paciente ↔ nutricionista responsável. */
export function canMessage(a: { id: string; role: string; nutritionistId?: string }, b: { id: string; role: string; nutritionistId?: string }) {
  const p = a.role === "patient" ? a : b.role === "patient" ? b : null, n = p === a ? b : a;
  return !!p && n.role === "nutritionist" && p.nutritionistId === n.id;
}
export const unreadFor = (msgs: { receiver_id: string; read_at: string | null }[], userId: string) => msgs.filter((m) => m.receiver_id === userId && !m.read_at).length;
