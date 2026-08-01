import type { GapMessageResult } from './types.js';
import { SESSION_GAP_MINUTES, GAP_WARNING_MINUTES } from './constants.js';

/**
 * Calcula el gap message y si se debe resetear el historial basado en
 * el tiempo desde el ultimo mensaje y el estado de inactividad.
 * Identico a los bloques `RESET POR INACTIVIDAD` y `RETOMAR POR INACTIVIDAD BOT`
 * del AI Agent original.
 */
export function computeGapMessage(
  histUpdatedAt: string | null,
  inactividadEstado?: string | null,
): GapMessageResult {
  let gapMessage = '';
  let shouldResetHistory = false;

  if (histUpdatedAt) {
    const minsSince =
      (Date.now() - new Date(histUpdatedAt).getTime()) / 60000;

    if (minsSince > SESSION_GAP_MINUTES) {
      shouldResetHistory = true;
    } else if (minsSince > GAP_WARNING_MINUTES) {
      gapMessage =
        '\nNOTA: Pasaron mas de ' +
        Math.round(minsSince) +
        ' minutos desde el ultimo mensaje del cliente. Si el cliente NO retoma el tema anterior, preguntale si continuamos con lo que hablabamos o si prefiere empezar de nuevo.';
    }
  }

  if (inactividadEstado === 'avisado') {
    gapMessage =
      '\nNOTA: El cliente retoma la conversacion despues de que le preguntamos si seguia ahi. Continua naturalmente donde ibamos. Si parece no recordar, haz un resumen breve de lo ultimo que hablaban.';
  }

  return { gapMessage, shouldResetHistory };
}
