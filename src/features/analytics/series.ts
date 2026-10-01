export interface Point { date: string; value: number }
/** Diferença absoluta e percentual entre primeiro e último ponto da série. */
export function change(series: Point[]) {
  if (series.length < 2) return null;
  const a = series[0].value, b = series[series.length - 1].value;
  return { abs: b - a, pct: a === 0 ? null : ((b - a) / a) * 100 };
}
/** Média móvel simples para suavizar peso/adesão (janela ≥ 1). */
export function movingAverage(series: Point[], window: number): Point[] {
  if (window < 1) throw new Error("Janela inválida");
  return series.map((p, i) => { const s = series.slice(Math.max(0, i - window + 1), i + 1); return { date: p.date, value: s.reduce((t, x) => t + x.value, 0) / s.length }; });
}
