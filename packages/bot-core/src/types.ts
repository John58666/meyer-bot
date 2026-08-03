export interface Provider {
  name: string;
  url: string;
  key: string;
  model: string;
}

export interface LLMResponse {
  content: string;
  reasoning: string | null;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  promptName: string;
  servicesTextFormateado: string;
  professionalsText: string;
  horarioTexto: string;
  fechaHoy: string;
  calendario: string;
  sesionContexto: string;
  gapMessage: string;
  disponibilidad: string;
  disponibilidadCompleta: string;
  textoOriginal: string;
  priorMessages: ChatMessage[];
  businessId: number;
  numeroLimpio: string;
  fueraDeHorario: boolean;
  mensajeHorario: string | null;
  forceMostrarSlots: string | null;
  timezone: string;
  politicaPrivacidadUrl?: string;
  inactividadEstado?: string | null;
  histUpdatedAt?: string | null;
}

export interface ChatResponse {
  output: string;
  rawOutput: string;
  provider: string;
  reasoning: string | null;
  debugError: string | null;
  businessId: number;
  numeroLimpio: string;
  historyJSON: string;
  deltaJSON: string;
}

export type ActionType =
  | 'CITA_CONFIRMADA'
  | 'GESTIONAR_CITA'
  | 'CANCELAR_CITA'
  | 'REAGENDAR_CITA';

export interface ValidationResult {
  passed: boolean;
  reason?: string;
  action?: ActionType;
}

export interface GapMessageResult {
  gapMessage: string;
  shouldResetHistory: boolean;
}

export interface LLMResult {
  result: LLMResponse;
  provider: string;
  errorLog: string;
}

export interface HttpRequestConfig {
  method: 'POST';
  url: string;
  headers: Record<string, string>;
  body: unknown;
  json: true;
  timeout: number;
  returnFullResponse: true;
}

export interface HttpResponse {
  statusCode: number;
  body: {
    choices: Array<{
      message: {
        content: string;
        reasoning?: string;
      };
    }>;
  };
}
