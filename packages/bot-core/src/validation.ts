export interface NeutralizerResult {
  content: string;
  neutralized: boolean;
  rawOriginal?: string;
}

/**
 * B17 guard. Detecta cuando el LLM emite CANCELAR_CITA sin una sesion activa.
 * GESTIONAR_CITA SI se permite sin sesion porque INICIA el flujo.
 * Identico al bloque `// 4.5 VALIDACION DE SESION POST-LLM` del AI Agent original.
 */
export function neutralizador(
  output: string,
  tieneSesionActiva: boolean,
): NeutralizerResult {
  if (tieneSesionActiva) {
    return { content: output, neutralized: false };
  }

  const outputLower = output.toLowerCase();
  const hasCancelContent =
    /(?:cita|la cita|tu cita).*(?:cancelad|anulad)/i.test(outputLower) &&
    outputLower.length < 120;

  const hasCancelCode = /CANCELAR_CITA\s*\|/i.test(output);

  if (hasCancelContent || hasCancelCode) {
    return {
      content:
        'Entendido, dime como puedo ayudarte. \u{1F60A} \u00BFQuieres agendar una cita?',
      neutralized: true,
      rawOriginal: output,
    };
  }

  return { content: output, neutralized: false };
}
