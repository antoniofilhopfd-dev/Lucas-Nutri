"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { patientSchema, GOALS, type PatientInput } from "@/features/patients/schema";
import { createPatient } from "@/features/patients/actions";
import { maskPhoneBR } from "@/lib/utils/phone";

const GOAL_LABEL: Record<(typeof GOALS)[number], string> = { weight_loss: "Emagrecimento", hypertrophy: "Hipertrofia", performance: "Performance", recomposition: "Recomposição corporal", maintenance: "Manutenção", health: "Saúde", other: "Outro" };

export default function NovoPaciente() {
  const r = useRouter(); const [msg, setMsg] = useState("");
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<PatientInput>({ resolver: zodResolver(patientSchema) as any, defaultValues: { practices_sports: false, modalities: [], secondary_goals: [] } });
  const field = "mt-1 w-full rounded-lg border border-mist bg-white p-2";
  const err = (k: keyof PatientInput) => errors[k] && <p role="alert" className="text-sm text-red-700">{String(errors[k]?.message)}</p>;
  return (
    <form className="max-w-xl space-y-4" onSubmit={handleSubmit(async (v) => {
      const res = await createPatient(v); if (res.ok) r.push("/nutri/pacientes"); else setMsg(res.message);
    })}>
      <h1 className="text-2xl font-semibold">Novo paciente</h1>
      <label className="block">Nome completo<input className={field} {...register("full_name")} />{err("full_name")}</label>
      <label className="block">Data de nascimento<input type="date" className={field} {...register("birth_date")} />{err("birth_date")}</label>
      <label className="block">Sexo biológico (usado nos cálculos)
        <select className={field} {...register("biological_sex")}><option value="">Selecione</option><option value="female">Feminino</option><option value="male">Masculino</option></select>{err("biological_sex")}</label>
      <label className="block">Telefone (login do paciente)
        <input inputMode="tel" className={field} {...register("phone", { onChange: (e) => setValue("phone", maskPhoneBR(e.target.value)) })} />{err("phone")}</label>
      <label className="block">Objetivo principal
        <select className={field} {...register("primary_goal")}><option value="">Selecione</option>{GOALS.map((g) => <option key={g} value={g}>{GOAL_LABEL[g]}</option>)}</select>{err("primary_goal")}</label>
      {msg && <p role="alert" className="text-red-700">{msg}</p>}
      <button disabled={isSubmitting} className="rounded-lg bg-olive px-5 py-2 text-white disabled:opacity-50">{isSubmitting ? "Salvando…" : "Salvar"}</button>
    </form>
  );
}
