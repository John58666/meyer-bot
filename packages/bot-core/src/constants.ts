import type { Provider } from './types.js';

export const PROVIDERS: Omit<Provider, 'key'>[] = [
  {
    name: 'gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.5-flash-lite',
  },
  {
    name: 'cerebras',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'gpt-oss-120b',
  },
  {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'openai/gpt-oss-120b',
  },
  {
    name: 'opencode-deepseek',
    url: 'https://opencode.ai/zen/go/v1/chat/completions',
    model: 'deepseek-v4-flash',
  },
  {
    name: 'openrouter-nemotron',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'nvidia/nemotron-3-nano-30b:free',
  },
  {
    name: 'openrouter-gemma',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'google/gemma-3-4b-it:free',
  },
  {
    name: 'openrouter-phi',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'microsoft/phi-3.5-mini-128k:free',
  },
];

const HORA_SEG = '\\d{1,2}:\\d{2}(?:\\s?[AaPp]\\.?[Mm]\\.?)?';

export const CODIGO_PATRONES: RegExp[] = [
  new RegExp(`CITA_CONFIRMADA\\|[^|\\n]+\\|\\d{1,2}\\/\\d{1,2}\\/\\d{4}\\|${HORA_SEG}(?:\\|[^|\\n]+)?`),
  new RegExp(`REAGENDAR_CITA\\|\\d+\\|\\d{1,2}\\/\\d{1,2}\\/\\d{4}\\|${HORA_SEG}(?:\\|[^|\\n]+)?`),
  /CANCELAR_CITA\|\s*\d+/,
  /GESTIONAR_CITA\|\s*(?:cancelar|reagendar)/i,
];

export const TIMEOUT_MS = 10_000;
export const MAX_TOKENS = 2048;
export const TEMPERATURE = 0.4;
export const MAX_HISTORY_MESSAGES = 14;
export const SESSION_GAP_MINUTES = 60;
export const GAP_WARNING_MINUTES = 10;
