import { z } from "zod";
export const POST_KINDS = ["meal", "achievement", "recipe", "tip", "substitution", "challenge", "official"] as const;
export const postSchema = z.object({
  kind: z.enum(POST_KINDS), body: z.string().trim().min(1, "Escreva algo").max(2000),
  image_path: z.string().optional(),
}).refine((p) => p.kind !== "official", { message: "Conteúdo oficial é publicado apenas pela equipe", path: ["kind"] });
export const commentSchema = z.object({ body: z.string().trim().min(1).max(1000) });

export type PostStatus = "visible" | "hidden" | "deleted";
export interface Consent { consent_type: "clinical_use" | "public_use"; accepted: boolean; revoked_at: string | null }
/** Foto só vai ao feed com consentimento de USO PÚBLICO vigente. Consentimento clínico nunca basta. */
export const hasPublicImageConsent = (cs: Consent[]) => cs.some((c) => c.consent_type === "public_use" && c.accepted && !c.revoked_at);
/** Fotos clínicas (bucket de avaliação) jamais entram no feed; só o bucket próprio da comunidade. */
export const isCommunityImagePath = (p: string) => p.startsWith("community-images/") && !p.includes("..");
export function canPublish(input: { image_path?: string }, consents: Consent[]): string | null {
  if (!input.image_path) return null;
  if (!isCommunityImagePath(input.image_path)) return "Fotos clínicas não podem ser publicadas na comunidade.";
  return hasPublicImageConsent(consents) ? null : "Para publicar fotos, autorize o uso público de imagem.";
}
const MOD: Record<PostStatus, PostStatus[]> = { visible: ["hidden", "deleted"], hidden: ["visible", "deleted"], deleted: [] };
export const canModerate = (from: PostStatus, to: PostStatus) => MOD[from].includes(to);
/** Autoria pública: apenas nome preferencial, nunca nome completo, telefone ou dados clínicos. */
export const publicName = (p: { preferred_name?: string | null; full_name: string }) => p.preferred_name?.trim() || p.full_name.split(" ")[0];
export const likeCount = (likes: { post_id: string }[], id: string) => likes.filter((l) => l.post_id === id).length;
