"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGNED_URL_TTL_S } from "./rules";

/** Valida autorização (RLS) e registra o acesso antes de gerar a URL assinada de curta duração. */
export async function signedPhotoUrl(photoId: string): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, message: "Faça login para continuar." };
  const { data: photo } = await sb.from("body_photos").select("id, patient_id, storage_path").eq("id", photoId).maybeSingle(); // RLS: nega se não autorizado
  if (!photo) return { ok: false, message: "Foto indisponível." };
  const { data, error } = await sb.storage.from("patient-body-photos").createSignedUrl(photo.storage_path, SIGNED_URL_TTL_S);
  if (error || !data) { console.error("signedPhotoUrl", error); return { ok: false, message: "Não foi possível abrir a foto." }; }
  await sb.from("audit_logs").insert({ user_id: user.id, patient_id: photo.patient_id, action: "view", entity: "body_photos", entity_id: photo.id });
  return { ok: true, url: data.signedUrl };
}
