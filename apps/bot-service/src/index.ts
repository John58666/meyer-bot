import express from 'express';
import type { ChatRequest, ChatResponse, ChatMessage } from '../packages/bot-core/src/types.js';
import { buildSystemPrompt } from '../packages/bot-core/src/prompt-builder.js';
import { callWithFallback } from '../packages/bot-core/src/llm-chain.js';
import { normalizar } from '../packages/bot-core/src/normalizer.js';
import { neutralizador } from '../packages/bot-core/src/validation.js';
import { computeGapMessage } from '../packages/bot-core/src/gap-message.js';
import { MAX_HISTORY_MESSAGES } from '../packages/bot-core/src/constants.js';

const PORT = parseInt(process.env.PORT || '3003', 10);
const REQUEST_TIMEOUT_MS = 25_000;

const app = express();
app.use(express.json({ limit: '100kb' }));

function safeDateInTimezone(tz: string): Date {
  try {
    return new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  } catch {
    return new Date();
  }
}

app.post('/api/chat', async (req, res) => {
  const startTime = Date.now();
  try {
    const body = req.body as ChatRequest;

    if (!body || typeof body.textoOriginal !== 'string') {
      console.error('BOT-SERVICE: Invalid request body, textoOriginal missing');
      console.error('BOT-SERVICE: Received body keys:', body ? Object.keys(body).join(',') : 'null');
      res.status(400).json({
        output: 'Error: solicitud invalida.',
        rawOutput: '',
        provider: 'error',
        reasoning: null,
        debugError: 'missing textoOriginal',
        businessId: body?.businessId ?? 0,
        numeroLimpio: body?.numeroLimpio ?? '',
        historyJSON: body?.priorMessages
          ? JSON.stringify(body.priorMessages).replace(/'/g, "''")
          : '[]',
        deltaJSON: '[]',
      });
      return;
    }

    const priorRaw = Array.isArray(body.priorMessages)
      ? body.priorMessages
      : typeof body.priorMessages === 'string'
        ? JSON.parse(body.priorMessages)
        : [];
    const prior: ChatMessage[] = priorRaw;

    const { gapMessage, shouldResetHistory } = computeGapMessage(
      body.histUpdatedAt ?? null,
      body.inactividadEstado,
    );

    const activePrior = (shouldResetHistory ? [] : prior).slice(-MAX_HISTORY_MESSAGES);

    if (body.fueraDeHorario === true && body.mensajeHorario) {
      res.json({
        output: body.mensajeHorario,
        rawOutput: body.mensajeHorario,
        provider: 'short-circuit-horario',
        reasoning: null,
        debugError: null,
        businessId: body.businessId,
        numeroLimpio: body.numeroLimpio,
        deltaJSON: JSON.stringify(activePrior).replace(/'/g, "''"),
      });
      return;
    }

    if (body.forceMostrarSlots) {
      const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const [fd, fm, fy] = body.forceMostrarSlots.split('/');
      const f = new Date(parseInt(fy), parseInt(fm) - 1, parseInt(fd));
      const fLabel = `${diasSemana[f.getUTCDay()]} ${parseInt(fd)} de ${meses[parseInt(fm) - 1]}`;
      const ahora = safeDateInTimezone(body.timezone || 'America/Bogota');
      const fin = new Date(ahora.getTime() + 7 * 86400000);
      const finLabel = `${diasSemana[fin.getDay()]} ${fin.getDate()} de ${meses[fin.getMonth()]}`;
      const msg = `¡Hola! \u{1F60A}\n\nVeo que quieres agendar para el ${fLabel}. Ese d\u00EDa est\u00E1 fuera de mi ventana de citas \u2014 por ahora solo puedo agendar hasta el ${finLabel} (pr\u00F3ximos 7 d\u00EDas).\n\n\u00BFQuieres agendar para alg\u00FAn d\u00EDa de esta semana? \u{1F60A}`;
      res.json({
        output: msg,
        rawOutput: 'short-circuit-b18',
        provider: 'short-circuit-b18',
        reasoning: null,
        debugError: null,
        businessId: body.businessId,
        numeroLimpio: body.numeroLimpio,
        deltaJSON: JSON.stringify(activePrior).replace(/'/g, "''"),
      });
      return;
    }

    const chatRequest: ChatRequest = {
      ...body,
      gapMessage,
    };

    const systemPrompt = buildSystemPrompt(chatRequest);

    const now = Date.now();

    const priorClean: ChatMessage[] = activePrior
      .filter((m: ChatMessage) => m && m.role && m.content)
      .map((m: ChatMessage) => ({ role: m.role, content: String(m.content) } as ChatMessage));

    priorClean.sort((a, b) => ((a as any).ts || 0) - ((b as any).ts || 0));

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...priorClean,
      { role: 'user', content: String(body.textoOriginal || '') } as ChatMessage,
    ];

    const { result, provider, errorLog } = await callWithFallback(messages);
    const neut = neutralizador(result.content, body.sesionContexto?.length > 0);
    const cleaned = normalizar(neut.content);

    const delta: ChatMessage[] = [
      { role: 'user', content: String(body.textoOriginal || ''), ts: now } as ChatMessage,
      { role: 'assistant', content: result.content, ts: now } as ChatMessage,
    ];

    const deltaJSON = JSON.stringify(delta).replace(/'/g, "''");

    const response: ChatResponse = {
      output: cleaned,
      rawOutput: result.content,
      provider,
      reasoning: result.reasoning,
      debugError: errorLog || null,
      businessId: body.businessId,
      numeroLimpio: body.numeroLimpio,
      deltaJSON: deltaJSON,
    };

    res.json(response);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('BOT-SERVICE ERROR:', msg);
    if (err instanceof Error && err.stack) console.error('BOT-SERVICE STACK:', err.stack);
    res.json({
      output: 'Disculpa, ocurrio un error inesperado. \u00BFPuedes intentar de nuevo? \u{1F60A}',
      rawOutput: '',
      provider: 'error',
      reasoning: null,
      debugError: msg,
      businessId: 0,
      numeroLimpio: '',
        deltaJSON: '[]',
    });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = app.listen(PORT, () => {
  console.log(`bot-service listening on :${PORT}`);
});

server.setTimeout(REQUEST_TIMEOUT_MS);

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => {
    process.exit(1);
  }, 5000);
});
