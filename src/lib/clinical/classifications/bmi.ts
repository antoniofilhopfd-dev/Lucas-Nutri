export const BMI_CLASSIFICATION = { source: "OMS (WHO), adultos", version: "1.0" } as const;
export function classifyBmi(v: number): string {
  if (v < 18.5) return "Baixo peso";
  if (v < 25) return "Eutrofia";
  if (v < 30) return "Sobrepeso";
  if (v < 35) return "Obesidade grau I";
  if (v < 40) return "Obesidade grau II";
  return "Obesidade grau III";
}
