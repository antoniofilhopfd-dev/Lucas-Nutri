"use client";
import { useState, useTransition } from "react";
import { instalar } from "./actions";
import { REGRA_SENHA } from "@/lib/senha-regra";

export function Form() {
  const [v, setV] = useState({ codigo: "", nome: "Lucas Bento", crn: "", email: "", senha: "" });
  const [msg, setMsg] = useState(""); const [feito, setFeito] = useState(false); const [pending, start] = useTransition();
  const f = "mt-1 w-full rounded-lg border border-mist bg-white p-3";
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  if (feito) return <p role="status" className="text-center">Acesso criado. <a className="underline" href="/login">Entrar em /login</a> (aba Nutricionista).</p>;
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => { setMsg(""); const r = await instalar(v); if (r.ok) setFeito(true); else setMsg(r.message ?? "Erro."); }); }}>
      <label className="block">Código de instalação<input className={f} value={v.codigo} onChange={set("codigo")} autoComplete="off" /></label>
      <label className="block">Nome<input className={f} value={v.nome} onChange={set("nome")} /></label>
      <label className="block">CRN<input className={f} value={v.crn} onChange={set("crn")} placeholder="CRN-6 00000" /></label>
      <label className="block">E-mail<input className={f} type="email" value={v.email} onChange={set("email")} autoComplete="username" /></label>
      <label className="block">Senha<input className={f} type="password" value={v.senha} onChange={set("senha")} autoComplete="new-password" /></label>
      <p className="text-sm text-graphite/60">{REGRA_SENHA}</p>
      <button disabled={pending} className="min-h-11 w-full rounded-lg bg-olive text-white disabled:opacity-50">{pending ? "Criando…" : "Criar acesso"}</button>
      {msg && <p role="alert" className="text-center text-red-700">{msg}</p>}
    </form>
  );
}
