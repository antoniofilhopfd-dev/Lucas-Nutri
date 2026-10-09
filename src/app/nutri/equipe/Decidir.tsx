"use client";
import { useState, useTransition } from "react";
import { pendentes } from "@/features/auth/convite-actions";

export function Decidir({ id }: { id: string }) {
  const [msg, setMsg] = useState(""); const [pending, start] = useTransition();
  const ir = (aprovar: boolean) => start(async () => { const r = await pendentes(id, aprovar); if (!r.ok) setMsg(r.message); });
  return <div className="flex shrink-0 items-center gap-1"><button disabled={pending} onClick={() => ir(true)} className="min-h-11 rounded-lg bg-olive px-3 text-sm text-white disabled:opacity-50">Aprovar</button>
    <button disabled={pending} onClick={() => ir(false)} className="min-h-11 px-2 text-sm underline">Recusar</button>{msg && <span role="alert" className="text-xs text-red-700">{msg}</span>}</div>;
}
