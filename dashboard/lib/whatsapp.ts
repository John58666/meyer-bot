"use server";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

export async function notificarCancelacionPorNegocio(
  numero: string,
  mensaje: string,
  whatsappInstance: string
) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error("[notificarCancelacionPorNegocio] EVOLUTION_API_URL o EVOLUTION_API_KEY no configurados");
    return { success: false as const, error: "WhatsApp no configurado" };
  }

  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${whatsappInstance}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: numero,
          text: mensaje,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(`[notificarCancelacionPorNegocio] HTTP ${response.status}: ${text}`);
      return { success: false as const, error: `Error HTTP ${response.status}` };
    }

    return { success: true as const };
  } catch (e) {
    console.error("[notificarCancelacionPorNegocio]", e);
    return { success: false as const, error: "Error de conexión con Evolution API" };
  }
}
