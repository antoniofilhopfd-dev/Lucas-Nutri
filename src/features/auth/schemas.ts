import { z } from "zod";
import { toE164BR } from "@/lib/utils/phone";
/** CRN: normaliza espaços/caixa; o formato exato varia por regional, então só exige conteúdo mínimo. */
export const normalizeCrn = (v: string) => v.trim().toUpperCase().replace(/\s+/g, " ");
export const nutritionistLoginSchema = z.object({
  crn: z.string().transform(normalizeCrn).pipe(z.string().min(3, "Informe o CRN")),
  password: z.string().min(8, "A senha tem ao menos 8 caracteres"),
});
export const phoneSchema = z.object({ phone: z.string().refine((v) => toE164BR(v) !== null, "Telefone inválido").transform((v) => toE164BR(v)!) });
export const otpSchema = phoneSchema.extend({ token: z.string().regex(/^\d{6}$/, "O código tem 6 dígitos") });
export const GENERIC_LOGIN_ERROR = "CRN ou senha inválidos.";   // mesma mensagem para CRN inexistente e senha errada
