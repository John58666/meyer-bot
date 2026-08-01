import type { ChatMessage, Provider, LLMResult, HttpResponse, HttpRequestConfig } from './types.js';
import { PROVIDERS, TIMEOUT_MS, MAX_TOKENS, TEMPERATURE } from './constants.js';

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;

  constructor(
    private name: string,
    private failureThreshold: number = 5,
    private resetTimeout: number = 30_000,
  ) {}

  get isOpen(): boolean {
    if (this.failures < this.failureThreshold) return false;
    const elapsed = Date.now() - this.lastFailureTime;
    if (elapsed > this.resetTimeout) {
      this.failures = 0;
      return false;
    }
    return true;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  recordSuccess(): void {
    this.failures = 0;
  }
}

export async function httpRequest(config: HttpRequestConfig): Promise<HttpResponse> {
  const { method, url, headers, body, timeout = TIMEOUT_MS } = config;

  const reqHeaders: Record<string, string> = { ...headers };

  let reqBody: BodyInit | undefined;
  if (body !== undefined && config.json) {
    reqBody = JSON.stringify(body);
    if (!reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(url, {
      method,
      headers: reqHeaders,
      body: reqBody,
      signal: controller.signal,
    });

    const parsedBody = await resp.json();

    if (config.returnFullResponse) {
      return {
        statusCode: resp.status,
        body: parsedBody as HttpResponse['body'],
      };
    }

    return {
      statusCode: resp.status,
      body: parsedBody as HttpResponse['body'],
    };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const breakers = new Map<string, CircuitBreaker>();

function getBreaker(name: string): CircuitBreaker {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker(name));
  }
  return breakers.get(name)!;
}

export function getProvidersWithKeys(): Provider[] {
  return PROVIDERS.map((p) => ({
    ...p,
    key: resolveApiKey(p.name) || '',
  }));
}

function resolveApiKey(name: string): string | undefined {
  switch (name) {
    case 'gemini':
      return process.env.GEMINI_API_KEY;
    case 'cerebras':
      return process.env.CEREBRAS_API_KEY;
    case 'groq':
      return process.env.GROQ_API_KEY;
    case 'opencode-deepseek':
      return process.env.OPENCODE_GO_API_KEY;
    case 'openrouter-nemotron':
    case 'openrouter-gemma':
    case 'openrouter-phi':
      return process.env.OPENROUTER_API_KEY;
    default:
      return undefined;
  }
}

const DEGRADED_MESSAGE =
  'Disculpa, estoy teniendo un problemita tecnico en este momento \u{1F64F} \u00BFPuedes escribirme de nuevo en un minutico?';

export async function callWithFallback(
  messages: ChatMessage[],
  options?: {
    timeout?: number;
    maxTokens?: number;
    temperature?: number;
    providers?: Provider[];
  },
): Promise<LLMResult> {
  const providers = options?.providers ?? getProvidersWithKeys();
  const timeout = options?.timeout ?? TIMEOUT_MS;
  const maxTokens = options?.maxTokens ?? MAX_TOKENS;
  const temperature = options?.temperature ?? TEMPERATURE;

  let errorLog = '';

  for (const p of providers) {
    if (!p.key) {
      errorLog += `[${p.name}: sin API key] `;
      continue;
    }

    const breaker = getBreaker(p.name);
    if (breaker.isOpen) {
      errorLog += `[${p.name}: circuit open] `;
      continue;
    }

    try {
      const resp = await httpRequest({
        method: 'POST',
        url: p.url,
        headers: {
          Authorization: `Bearer ${p.key}`,
          'Content-Type': 'application/json',
        },
        body: { model: p.model, messages, temperature, max_tokens: maxTokens },
        json: true,
        timeout,
        returnFullResponse: true,
      });

      if (resp.statusCode !== 200) {
        throw new Error(`status ${resp.statusCode}`);
      }

      const choice = resp.body?.choices?.[0];
      if (!choice?.message) {
        throw new Error('sin choices');
      }

      const content = choice.message.content;
      if (content == null || String(content).trim() === '') {
        throw new Error('content vacio');
      }

      breaker.recordSuccess();

      return {
        result: {
          content: String(content),
          reasoning: choice.message.reasoning ?? null,
        },
        provider: p.name,
        errorLog,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errorLog += `[${p.name}: ${msg}] `;
      breaker.recordFailure();
    }
  }

  return {
    result: {
      content: DEGRADED_MESSAGE,
      reasoning: null,
    },
    provider: 'none',
    errorLog,
  };
}
