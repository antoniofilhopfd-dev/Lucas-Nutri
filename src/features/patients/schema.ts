import { z } from "zod";
import { toE164BR } from "@/lib/utils/phone";

export const MODALITIES = ["Musculação", "Jiu-Jitsu", "Corrida", "Ciclismo", "Natação", "CrossFit", "Futebol", "Outro"] as const;
export const GOALS = ["weight_loss", "hypertrophy", "performance", "recomposition", "maintenance", "health", "other"] as const;
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const patientSchema = z.object({
  full_name: z.string().trim().min(3, "Informe o nome completo"),
  preferred_name: z.string().trim().optional(),
  birth_date: iso.refine((d) => d <= new Date().toISOString().slice(0, 10), "Data futura"),
  biological_sex: z.enum(["male", "female"], { message: "Obrigatório para os cálculos" }),
  // Opcionais e sensíveis: finalidade = personalização autorizada; nunca entram em fórmulas.
  gender_identity: z.string().trim().optional(),
  sexual_orientation: z.string().trim().optional(),
  ethnicity: z.string().trim().optional(),
  occupation: z.string().trim().optional(),
  phone: z.string().refine((v) => toE164BR(v) !== null, "Telefone inválido").transform((v) => toE164BR(v)!),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  practices_sports: z.boolean().default(false),
  modalities: z.array(z.enum(MODALITIES)).default([]),
  primary_modality: z.enum(MODALITIES).optional(),
  weekly_frequency: z.number().int().min(0).max(14).optional(),
  primary_goal: z.enum(GOALS),
  secondary_goals: z.array(z.enum(GOALS)).default([]),
}).refine((v) => !v.primary_modality || v.modalities.includes(v.primary_modality), {
  path: ["primary_modality"], message: "Escolha entre as modalidades marcadas",
}).refine((v) => !v.secondary_goals.includes(v.primary_goal), {
  path: ["secondary_goals"], message: "Objetivo secundário repete o primário",
});
export type PatientInput = z.input<typeof patientSchema>;
