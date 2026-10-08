import { exigirUsuario } from "@/server/auth";
export default async function PacienteLayout({ children }: { children: React.ReactNode }) {
  await exigirUsuario(["patient"]);
  return <>{children}</>;
}
