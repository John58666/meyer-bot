import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt } from '../prompt-builder.js';
import type { ChatRequest } from '../types.js';

const sampleRequest: ChatRequest = {
  promptName: 'Peluqueria Test',
  servicesTextFormateado: '1. Corte - $25.000\n2. Tinte - $80.000',
  professionalsText: 'Cristian',
  horarioTexto: 'Lunes: 9:00 AM - 7:00 PM',
  fechaHoy: '01/08/2026',
  calendario: 'Hoy: 01/08/2026\nManana: 02/08/2026',
  sesionContexto: '',
  gapMessage: '',
  disponibilidad: 'Lunes: 9:00 AM, 10:00 AM',
  disponibilidadCompleta: 'Lunes: 9:00 AM, 10:00 AM, 11:00 AM',
  textoOriginal: 'Hola',
  priorMessages: [],
  businessId: 1,
  numeroLimpio: '573001234567',
  fueraDeHorario: false,
  mensajeHorario: null,
  forceMostrarSlots: null,
  timezone: 'America/Bogota',
};

describe('prompt-builder', () => {
  it('builds a non-empty prompt', () => {
    const prompt = buildSystemPrompt(sampleRequest);
    assert.ok(prompt.length > 500);
  });

  it('contains critical action codes', () => {
    const prompt = buildSystemPrompt(sampleRequest);
    assert.ok(prompt.includes('CITA_CONFIRMADA'));
    assert.ok(prompt.includes('GESTIONAR_CITA'));
    assert.ok(prompt.includes('CANCELAR_CITA'));
    assert.ok(prompt.includes('REAGENDAR_CITA'));
  });

  it('contains business-specific data', () => {
    const prompt = buildSystemPrompt(sampleRequest);
    assert.ok(prompt.includes('Peluqueria Test'));
    assert.ok(prompt.includes('Corte - $25.000'));
    assert.ok(prompt.includes('Cristian'));
  });

  it('contains NO n8n-specific references', () => {
    const prompt = buildSystemPrompt(sampleRequest);
    assert.ok(!prompt.includes('$env'));
    assert.ok(!prompt.includes("$('"));
    assert.ok(!prompt.includes('{{ '));
    assert.ok(!prompt.includes('this.helpers'));
  });

  it('handles missing optional fields gracefully', () => {
    const minimal: ChatRequest = {
      ...sampleRequest,
      professionalsText: '',
      politicaPrivacidadUrl: undefined,
      inactividadEstado: null,
    };
    const prompt = buildSystemPrompt(minimal);
    assert.ok(prompt.length > 500);
    assert.ok(prompt.includes('No aplica'));
  });

  it('contains privacy policy placeholder when no URL', () => {
    const noUrl: ChatRequest = { ...sampleRequest, politicaPrivacidadUrl: undefined };
    const prompt = buildSystemPrompt(noUrl);
    assert.ok(prompt.includes('[enlace a pol'));
  });

  it('injects privacy policy URL when provided', () => {
    const withUrl: ChatRequest = {
      ...sampleRequest,
      politicaPrivacidadUrl: 'https://test.com/privacidad',
    };
    const prompt = buildSystemPrompt(withUrl);
    assert.ok(prompt.includes('https://test.com/privacidad'));
    assert.ok(!prompt.includes('[enlace a pol'));
  });
});
