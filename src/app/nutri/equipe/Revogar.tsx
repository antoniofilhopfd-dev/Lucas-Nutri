"use client";
import { revogar } from "@/features/auth/convite-actions";
export function Revogar({ id }: { id: string }) {
  return <button className="min-h-11 px-2 text-sm underline" onClick={() => { void revogar(id); }}>Cancelar</button>;
}
