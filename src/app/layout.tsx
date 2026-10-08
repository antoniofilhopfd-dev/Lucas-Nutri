import "./globals.css";
import type { Metadata, Viewport } from "next";
export const metadata: Metadata = { title: "BentoNutriSync", description: "Prontuário nutricional longitudinal", appleWebApp: { capable: true, title: "BentoNutri", statusBarStyle: "default" } };
export const viewport: Viewport = { themeColor: "#4F6B4A", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
