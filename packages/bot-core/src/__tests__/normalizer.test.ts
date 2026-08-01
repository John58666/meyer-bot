import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizar } from '../normalizer.js';

describe('normalizer', () => {
  it('extracts CITA_CONFIRMADA code from text with prefix', () => {
    const raw = 'Claro! CITA_CONFIRMADA|Corte caballero|14/07/2026|10:00 AM|Cristian';
    const result = normalizar(raw);
    assert.ok(result.startsWith('CITA_CONFIRMADA'));
    assert.ok(result.includes('14/07/2026'));
    assert.ok(!result.includes('Claro!'));
  });

  it('strips backticks and extracts code', () => {
    const raw = '```\nCANCELAR_CITA|42\n```';
    const result = normalizar(raw);
    assert.equal(result, 'CANCELAR_CITA|42');
  });

  it('returns conversational text unchanged if no code pattern', () => {
    const raw = 'Hola, buenos dias. Quiero agendar un corte.';
    const result = normalizar(raw);
    assert.equal(result, raw);
  });

  it('extracts GESTIONAR_CITA from mixed text', () => {
    const raw = 'Perfecto, voy a revisar tus citas. GESTIONAR_CITA|cancelar';
    const result = normalizar(raw);
    assert.equal(result, 'GESTIONAR_CITA|cancelar');
  });

  it('handles empty string gracefully', () => {
    const result = normalizar('');
    assert.equal(result, '');
  });

  it('extracts REAGENDAR_CITA with all fields', () => {
    const raw = 'REAGENDAR_CITA|5|20/08/2026|3:00 PM|Cristian';
    const result = normalizar(raw);
    assert.ok(result.startsWith('REAGENDAR_CITA'));
  });
});
