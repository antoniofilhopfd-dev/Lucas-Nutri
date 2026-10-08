/** Fotos clínicas: arquivo no disco do servidor (STORAGE_DIR, fora da pasta pública); acesso só por rota autenticada. */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { transacao } from "../mysql";
import { auditar, exigirEscritaConsulta, exigirLerPaciente, type Actor, AcessoNegado } from "../authz";
import { inserir, RegraNegocio } from "../sql";
import { temConsentimentoImagem } from "./consentimentos";
import { photoPath, validateUpload, type Angle } from "@/features/photometry/rules";

const raiz = () => { const d = process.env.STORAGE_DIR; if (!d) throw new RegraNegocio("Armazenamento de arquivos não configurado (STORAGE_DIR)."); return resolve(d); };
/** Impede sair da pasta de armazenamento ("../"). */
const seguro = (rel: string) => { const base = raiz(), p = resolve(join(base, rel)); if (p !== base && !p.startsWith(base + sep)) throw new AcessoNegado(); return p; };

export async function salvarFoto(a: Actor, consultationId: string, angle: Angle, bytes: Buffer, mime: "image/webp" | "image/jpeg"): Promise<{ id: string }> {
  const erro = validateUpload(mime, bytes.length); if (erro) throw new RegraNegocio(erro);
  return transacao(async (q) => {
    const c = await exigirEscritaConsulta(q, a, consultationId, true);
    if (!(await temConsentimentoImagem(q, c.patient_id, "clinical_use"))) throw new RegraNegocio("O paciente ainda não autorizou o uso clínico de imagens.");
    let [av] = await q.consultar<{ id: string }>("SELECT id FROM photometric_assessments WHERE consultation_id=? LIMIT 1", [c.id]);
    if (!av) av = { id: await inserir(q, "photometric_assessments", { patient_id: c.patient_id, consultation_id: c.id }) };
    const rel = photoPath(c.patient_id, av.id, angle, mime);
    const destino = seguro(join("fotos", rel));
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, bytes, { mode: 0o600 });
    const id = await inserir(q, "body_photos", { photometric_assessment_id: av.id, patient_id: c.patient_id, angle, storage_path: join("fotos", rel), mime_type: mime, file_size: bytes.length });
    await auditar(q, a, { patientId: c.patient_id, consultationId: c.id, action: "insert", entity: "body_photos", entityId: id });
    return { id };
  });
}

/** Lê a foto SOMENTE se o usuário pode ver o paciente; cada acesso é auditado. */
export async function lerFoto(a: Actor, photoId: string): Promise<{ bytes: Buffer; mime: string }> {
  return transacao(async (q) => {
    const [f] = await q.consultar<{ patient_id: string; storage_path: string; mime_type: string }>("SELECT patient_id, storage_path, mime_type FROM body_photos WHERE id=?", [photoId]);
    if (!f) throw new AcessoNegado();
    await exigirLerPaciente(q, a, f.patient_id);
    await auditar(q, a, { patientId: f.patient_id, action: "view", entity: "body_photos", entityId: photoId });
    return { bytes: await readFile(seguro(f.storage_path)), mime: f.mime_type };
  });
}
