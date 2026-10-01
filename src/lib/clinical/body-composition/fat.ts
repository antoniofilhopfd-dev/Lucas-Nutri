export type FatEquation = "siri" | "brozek";
export const FAT_EQUATIONS: Record<FatEquation, { name: string; version: string; reference: string }> = {
  siri: { name: "Siri", version: "1.0", reference: "Siri WE (1961). Body composition from fluid spaces and density." },
  brozek: { name: "Brožek", version: "1.0", reference: "Brožek J et al. (1963). Densitometric analysis of body composition. Ann N Y Acad Sci." },
};
/** %G a partir da densidade corporal (Db). */
export function bodyFatPercent(density: number, eq: FatEquation): number {
  if (!(density > 0.9 && density < 1.2)) throw new Error("Densidade corporal fora do intervalo plausível");
  return eq === "siri" ? (4.95 / density - 4.5) * 100 : (4.57 / density - 4.142) * 100;
}
export const fatMassKg = (weightKg: number, fatPct: number) => weightKg * (fatPct / 100);
export const leanMassKg = (weightKg: number, fatPct: number) => weightKg * (1 - fatPct / 100);
