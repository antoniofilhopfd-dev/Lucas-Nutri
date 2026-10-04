import { supabaseServer } from "@/lib/supabase/server";
import { ImportarForm } from "./ImportarForm";

export const dynamic = "force-dynamic";
export default async function ImportarPlano({ searchParams }: { searchParams: Promise<{ paciente?: string; consulta?: string }> }) {
  const sp = await searchParams; const sb = await supabaseServer();
  // RLS limita à carteira do nutricionista; só consultas que ainda aceitam escrita.
  const [{ data: pats }, { data: cons }] = await Promise.all([
    sb.from("patients").select("id, profiles(full_name)").order("created_at", { ascending: false }).limit(200),
    sb.from("consultations").select("id, patient_id, consultation_type, scheduled_at, created_at").in("status", ["scheduled", "in_progress"]).order("created_at", { ascending: false }).limit(500),
  ]);
  const patients = (pats ?? []).map((p: any) => ({ id: p.id as string, name: (p.profiles?.full_name ?? "—") as string }));
  const consultations = (cons ?? []).map((c: any) => ({ id: c.id as string, patientId: c.patient_id as string, label: `${new Date(c.scheduled_at ?? c.created_at).toLocaleDateString("pt-BR")} · ${c.consultation_type}` }));
  return <ImportarForm patients={patients} consultations={consultations} initialPatient={sp.paciente} initialConsultation={sp.consulta} />;
}
