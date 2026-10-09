"use client";
import { useState, useTransition } from "react";
import { convidar } from "@/features/auth/convite-actions";

export function Convidar() {
  const [v, setV] = useState({ nome: "", email: "", crn: "", papel: "nutritionist" as "nutritionist" | "admin" });
  const [msg, setMsg] = useState(""); const [link, setLink] = useState(""); const [expira, setExpira] = useState(""); const [pending, start] = useTransition();
  const f = "mt-1 w-full rounded-lg border border-mist bg-white p-3";
  const zap = `https://wa.me/?text=${encodeURIComponent(`Seu acesso ao BentoNutriSync: ${link}`)}`;
  return (
    <div className="space-y-3">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => { setMsg(""); setLink(""); const r = await convidar(v); if (r.ok) { setLink(r.link); setExpira(r.expira); setV({ ...v, nome: "", email: "", crn: "" }); } else setMsg(r.message); }); }}>
        <label className="block">Nome<input className={f} value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} /></label>
        <label className="block">E-mail<input className={f} type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></label>
        <label className="block">Perfil<select className={f} value={v.papel} onChange={(e) => setV({ ...v, papel: e.target.value as "nutritionist" | "admin" })}><option value="nutritionist">Nutricionista</option><option value="admin">Administrador</option></select></label>
        {v.papel === "nutritionist" && <label className="block">CRN<input className={f} placeholder="CRN-6 00000" value={v.crn} onChange={(e) => setV({ ...v, crn: e.target.value })} /></label>}
        <button disabled={pending} className="min-h-11 w-full rounded-lg bg-olive text-white disabled:opacity-50">{pending ? "Criando…" : "Gerar convite"}</button>
      </form>
      {msg && <p role="alert" className="text-red-700">{msg}</p>}
      {link && <div role="status" className="space-y-2 rounded-xl border border-olive bg-white p-3">
        <p className="text-sm">Link do convite (válido até {expira}). Ele aparece só agora, copie e envie:</p>
        <input readOnly className={f} value={link} onFocus={(e) => e.currentTarget.select()} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="min-h-11 rounded-lg border border-olive" onClick={() => navigator.clipboard?.writeText(link)}>Copiar</button>
          <a className="flex min-h-11 items-center justify-center rounded-lg border border-olive" href={zap} target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
      </div>}
    </div>
  );
}
