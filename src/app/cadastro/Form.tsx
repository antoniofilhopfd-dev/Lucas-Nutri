"use client";
import { useState } from "react";
import { FormSenha } from "@/components/FormSenha";
import { cadastrar } from "@/features/auth/convite-actions";

export function Cadastro() {
  const [enviado, setEnviado] = useState(false);
  if (enviado) return <p role="status" className="text-center">Cadastro enviado. Assim que o administrador aprovar, você poderá entrar em <a className="underline" href="/login">/login</a>.</p>;
  return <FormSenha botao="Criar conta" extras={[{ nome: "nome", rotulo: "Nome completo" }, { nome: "crn", rotulo: "CRN (ex.: CRN-6 00000)" }, { nome: "email", rotulo: "E-mail", tipo: "email", auto: "username" }]}
    enviar={async (senha, x) => { const r = await cadastrar({ nome: x.nome ?? "", email: x.email ?? "", crn: x.crn ?? "", senha }); if (r.ok) setEnviado(true); return r; }} />;
}
