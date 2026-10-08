"use client";
import { useState, useTransition } from "react";
import { gerarCodigoAcesso } from "@/features/patients/actions";

/** O código aparece uma única vez, para o nutricionista enviar pelo WhatsApp (vale 10 minutos). */
export function CodigoAcesso({ patientId, telefone }: { patientId: string; telefone?: string }) {
  const [codigo, setCodigo] = useState(""); const [msg, setMsg] = useState(""); const [pending, start] = useTransition();
  return (
    <div className="rounded-xl border border-mist bg-white p-4">
      <h2 className="font-medium">Acesso do paciente</h2>
      <p className="text-sm text-graphite/70">Gere um código de uso único e envie ao paciente{telefone ? ` (${telefone})` : ""}. Ele vale por 10 minutos.</p>
      <button disabled={pending} className="mt-2 rounded-lg bg-olive px-4 py-2 text-white disabled:opacity-50"
        onClick={() => start(async () => { setMsg(""); const r = await gerarCodigoAcesso(patientId); if (r.ok) setCodigo((r as { codigo: string }).codigo); else setMsg(r.message); })}>{pending ? "Gerando…" : "Gerar código de acesso"}</button>
      {codigo && <p className="mt-3 text-2xl font-extrabold tracking-[.3em] tabular-nums" aria-live="polite">{codigo}</p>}
      {msg && <p role="alert" className="mt-2 text-red-700">{msg}</p>}
    </div>
  );
}
