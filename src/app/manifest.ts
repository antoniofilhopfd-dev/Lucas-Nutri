import type { MetadataRoute } from "next";

/** Torna o site instalável no celular ("Adicionar à tela inicial"): ícone, tela cheia, sem barra do navegador. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BentoNutriSync", short_name: "BentoNutri", description: "Prontuário nutricional longitudinal",
    start_url: "/login", scope: "/", display: "standalone", orientation: "portrait",
    background_color: "#F7F5EF", theme_color: "#4F6B4A", lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
