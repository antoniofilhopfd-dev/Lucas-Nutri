import { Logo } from "@/components/Logo";
export default function Home() {
  return <main className="mx-auto flex max-w-xl flex-col items-center gap-3 p-10 text-center"><Logo variant="full" className="h-40" />
    <h1 className="text-2xl font-semibold">BentoNutriSync</h1><p className="text-graphite/70">Prontuário nutricional longitudinal.</p></main>;
}
