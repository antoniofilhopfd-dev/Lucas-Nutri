import { z } from "zod";
/** Importação de bases de alimentos (TACO ou outras). Exige fonte, versão e licença: nada é copiado sem direito de uso. */
export const foodRowSchema = z.object({
  name: z.string().trim().min(2), source: z.string().trim().min(2), source_version: z.string().trim().min(1),
  license: z.string().trim().min(2, "Informe a licença/permissão de uso"),
  serving_unit: z.enum(["g", "ml"]).default("g"),
  calories: z.coerce.number().min(0).max(950), protein: z.coerce.number().min(0).max(100), carbohydrate: z.coerce.number().min(0).max(100),
  fat: z.coerce.number().min(0).max(100), fiber: z.coerce.number().min(0).max(100), sodium: z.coerce.number().min(0).optional(),
}).refine((r) => r.protein + r.carbohydrate + r.fat <= 100.5, { message: "Macros somam mais de 100 g por 100 g" });
export function validateFoodRows(rows: unknown[]) {
  const ok: z.infer<typeof foodRowSchema>[] = []; const errors: { row: number; message: string }[] = [];
  rows.forEach((r, i) => { const p = foodRowSchema.safeParse(r); if (p.success) ok.push(p.data); else errors.push({ row: i + 1, message: p.error.issues[0].message }); });
  return { ok, errors };
}
