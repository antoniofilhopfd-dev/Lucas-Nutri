import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface Metric { label: string; unit: string; initial: number; followup: number }
export const diff = (m: Metric) => ({ abs: m.followup - m.initial, pct: m.initial === 0 ? null : ((m.followup - m.initial) / m.initial) * 100 });
const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export interface EvolutionReport { patientName: string; initialDate: string; followupDate: string; nutritionist: string; metrics: Metric[]; methodology: string[]; logoPng?: Uint8Array }

export async function buildEvolutionPdf(r: EvolutionReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]); const green = rgb(0.18, 0.32, 0.22);
  let y = 790;
  if (r.logoPng) { const img = await doc.embedPng(r.logoPng); const s = 60 / img.height; page.drawImage(img, { x: 40, y: y - 50, width: img.width * s, height: 60 }); }
  page.drawText("Relatório de Evolução Física", { x: 130, y: y - 10, size: 18, font: bold, color: green });
  page.drawText("BentoNutri · Lucas Bento, Nutricionista", { x: 130, y: y - 30, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 90;
  page.drawText(`Paciente: ${r.patientName}`, { x: 40, y, size: 11, font: bold }); y -= 16;
  page.drawText(`Inicial: ${r.initialDate}   ·   Retorno: ${r.followupDate}   ·   Responsável: ${r.nutritionist}`, { x: 40, y, size: 10, font }); y -= 30;
  const cols = [40, 220, 300, 380, 460];
  ["Medida", "Inicial", "Retorno", "Dif.", "Dif. %"].forEach((h, i) => page.drawText(h, { x: cols[i], y, size: 10, font: bold, color: green })); y -= 6;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.5, color: green }); y -= 16;
  for (const m of r.metrics) {
    const d = diff(m);
    [`${m.label} (${m.unit})`, fmt(m.initial), fmt(m.followup), (d.abs > 0 ? "+" : "") + fmt(d.abs), d.pct === null ? "—" : (d.pct > 0 ? "+" : "") + fmt(d.pct) + "%"]
      .forEach((t, i) => page.drawText(t, { x: cols[i], y, size: 10, font }));
    y -= 16;
  }
  y -= 14; page.drawText("Metodologia e referências", { x: 40, y, size: 11, font: bold, color: green }); y -= 16;
  for (const l of r.methodology) { page.drawText(l.slice(0, 105), { x: 40, y, size: 8.5, font }); y -= 12; }
  page.drawText("Documento gerado pelo BentoNutriSync. Contém dados de saúde: uso restrito ao paciente e à equipe autorizada.", { x: 40, y: 30, size: 7.5, font, color: rgb(0.5, 0.5, 0.5) });
  return doc.save();
}
