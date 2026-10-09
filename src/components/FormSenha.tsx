"use client";
import { useState, useTransition } from "react";
import { REGRA_SENHA } from "@/lib/senha-regra";

/** Campos de senha + confirmação. `enviar` devolve {ok:false,message} em erro; em sucesso a ação redireciona. */
export function FormSenha({ botao, enviar, extras }: { botao: string; enviar: (senha: string, extras: Record<string, string>) => Promise<{ ok: boolean; message?: string } | void>; extras?: { nome: string; rotulo: string; tipo?: string; auto?: string }[] }) {
  const [v, setV] = useState<Record<string, string>>({}); const [s1, setS1] = useState(""); const [s2, setS2] = useState("");
  const [msg, setMsg] = useState(""); const [pending, start] = useTransition();
  const f = "mt-1 w-full rounded-lg border border-mist bg-white p-3";
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (s1 !== s2) return setMsg("As senhas não são iguais."); start(async () => { setMsg(""); const r = await enviar(s1, v); if (r && !r.ok) setMsg(r.message ?? "Erro."); }); }}>
      {extras?.map((x) => <label key={x.nome} className="block">{x.rotulo}<input className={f} type={x.tipo ?? "text"} autoComplete={x.auto} value={v[x.nome] ?? ""} onChange={(e) => setV({ ...v, [x.nome]: e.target.value })} /></label>)}
      <label className="block">Crie sua senha<input className={f} type="password" autoComplete="new-password" value={s1} onChange={(e) => setS1(e.target.value)} /></label>
      <label className="block">Repita a senha<input className={f} type="password" autoComplete="new-password" value={s2} onChange={(e) => setS2(e.target.value)} /></label>
      <p className="text-sm text-graphite/60">{REGRA_SENHA}</p>
      <button disabled={pending} className="min-h-11 w-full rounded-lg bg-olive text-white disabled:opacity-50">{pending ? "Aguarde…" : botao}</button>
      {msg && <p role="alert" className="text-center text-red-700">{msg}</p>}
    </form>
  );
}
