export const smsConfigurado = () => !!process.env.SMS_WEBHOOK_URL;
/** Envio do código do paciente. SMS_WEBHOOK_URL (qualquer provedor via HTTP) ou, sem ele, entrega manual pelo nutricionista (WhatsApp). */
export async function enviarCodigo(telefoneE164: string, codigo: string): Promise<"enviado" | "manual"> {
  const url = process.env.SMS_WEBHOOK_URL;
  if (!url) {
    if (process.env.NODE_ENV !== "production") console.log(`[sms] (desenvolvimento) código para ${telefoneE164}: ${codigo}`); // nunca em produção
    return "manual";
  }
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...(process.env.SMS_WEBHOOK_TOKEN ? { authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` } : {}) },
    body: JSON.stringify({ to: telefoneE164, message: `Seu código BentoNutri: ${codigo}. Vale por 10 minutos.` }) });
  if (!r.ok) throw new Error(`falha no envio do SMS (${r.status})`);
  return "enviado";
}
