"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { loginProfissional, pedirCodigo, entrarPaciente } from "@/features/auth/actions";
import { maskPhoneBR } from "@/lib/utils/phone";

export default function Login() {
  const [mode, setMode] = useState<"patient" | "nutri">("patient");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState(""); const [token, setToken] = useState("");
  const [ident, setIdent] = useState(""); const [pw, setPw] = useState("");
  const [msg, setMsg] = useState(""); const [pending, start] = useTransition();
  const f = "mt-1 w-full rounded-lg border border-mist bg-white p-3";
  const run = (fn: () => Promise<{ ok: boolean; message?: string } | void>, after?: () => void) => start(async () => {
    setMsg(""); const r = await fn(); if (r && !r.ok) setMsg(r.message ?? "Não foi possível entrar."); else after?.();
  });
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 p-6">
      <div className="flex justify-center"><Logo variant="full" className="h-32" /></div>
      <div role="tablist" className="grid grid-cols-2 rounded-full border border-mist p-1">
        {(["patient", "nutri"] as const).map((m) => <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setMsg(""); }}
          className={`min-h-11 rounded-full ${mode === m ? "bg-olive text-white" : ""}`}>{m === "patient" ? "Paciente" : "Nutricionista"}</button>)}
      </div>
      {mode === "nutri" ? (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => loginProfissional({ identifier: ident, password: pw })); }}>
          <label className="block">CRN ou e-mail<input className={f} value={ident} onChange={(e) => setIdent(e.target.value)} autoComplete="username" /></label>
          <label className="block">Senha<input className={f} type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></label>
          <button disabled={pending} className="min-h-11 w-full rounded-lg bg-olive text-white disabled:opacity-50">{pending ? "Entrando…" : "Entrar"}</button>
          <p className="text-center text-sm"><Link className="underline" href="/cadastro">Criar conta de nutricionista</Link></p>
        </form>
      ) : step === "phone" ? (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => pedirCodigo({ phone }), () => setStep("code")); }}>
          <label className="block">Telefone<input className={f} inputMode="tel" value={phone} onChange={(e) => setPhone(maskPhoneBR(e.target.value))} autoComplete="tel" placeholder="+55 (83) 99999-9999" /></label>
          <button disabled={pending} className="min-h-11 w-full rounded-lg bg-olive text-white disabled:opacity-50">Receber código</button>
          <p className="text-center text-sm text-graphite/60">O código é enviado por SMS ou pelo seu nutricionista, pelo WhatsApp.</p>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => entrarPaciente({ phone, token })); }}>
          <p className="text-sm text-graphite/70">Digite o código de 6 dígitos para {phone}.</p>
          <label className="block">Código<input className={f} inputMode="numeric" maxLength={6} value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" /></label>
          <button disabled={pending} className="min-h-11 w-full rounded-lg bg-olive text-white disabled:opacity-50">Entrar</button>
          <button type="button" className="w-full text-sm underline" onClick={() => setStep("phone")}>Trocar telefone</button>
        </form>
      )}
      {msg && <p role="alert" className="text-center text-red-700">{msg}</p>}
    </main>
  );
}
