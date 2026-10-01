const pos = (n: number, label: string) => { if (!(n > 0) || !Number.isFinite(n)) throw new Error(`${label} inválido`); return n; };
/** IMC = peso(kg) / altura(m)². Sem arredondamento intermediário. */
export const bmi = (weightKg: number, heightCm: number) => pos(weightKg, "peso") / (pos(heightCm, "altura") / 100) ** 2;
/** RCQ = cintura / quadril */
export const waistHipRatio = (waistCm: number, hipCm: number) => pos(waistCm, "cintura") / pos(hipCm, "quadril");
/** RCEst = cintura / altura */
export const waistHeightRatio = (waistCm: number, heightCm: number) => pos(waistCm, "cintura") / pos(heightCm, "altura");
/** Assimetria derivada |D − E|; nunca digitada. */
export const asymmetry = (right: number, left: number) => Math.abs(right - left);
/** Apenas para exibição (precisão de 0,1). */
export const round1 = (n: number) => Math.round(n * 10) / 10;
