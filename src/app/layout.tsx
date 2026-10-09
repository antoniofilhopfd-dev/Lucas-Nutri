import "./globals.css";
import type { Metadata, Viewport } from "next";
export const metadata: Metadata = { title: "BentoNutriSync", description: "Prontuário nutricional longitudinal", appleWebApp: { capable: true, title: "BentoNutri", statusBarStyle: "default" } };
export const viewport: Viewport = { themeColor: "#4F6B4A", width: "device-width", initialScale: 1, viewportFit: "cover" };
/** Formato de aplicativo de celular: uma coluna única de até 430px, centralizada mesmo em tela grande. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body className="bg-mist"><div className="relative mx-auto min-h-screen w-full max-w-[430px] bg-paper shadow-[0_0_40px_rgba(0,0,0,.08)]">{children}</div></body></html>;
}
