import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extraerFechaLejana } from '../date-parser.js';

describe('date-parser', () => {
  it('detects explicit DD/MM/YYYY beyond 7 days', () => {
    const hoy = new Date();
    const dia = hoy.getDate() + 15;
    const mes = hoy.getMonth() + 1;
    const anio = hoy.getFullYear();
    const fechaStr = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;
    const result = extraerFechaLejana(`Quiero agendar para el ${fechaStr}`);
    assert.ok(result !== null, 'should detect date >7 days');
  });

  it('detects "DD de mes" beyond 7 days', () => {
    const hoy = new Date();
    const futuro = new Date(hoy.getTime() + 15 * 86400000);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const fechaStr = `${futuro.getDate()} de ${meses[futuro.getMonth()]}`;
    const result = extraerFechaLejana(`Quiero el ${fechaStr}`);
    assert.ok(result !== null, 'should detect named month date >7 days');
  });

  it('detects "en N dias" beyond 7 days', () => {
    const result = extraerFechaLejana('Quiero agendar en 10 dias');
    assert.ok(result !== null, 'should detect "en N dias" >7');
  });

  it('returns null for dates within 7 days', () => {
    const result = extraerFechaLejana('Quiero agendar pasado manana');
    assert.equal(result, null, 'should NOT flag dates within 7 days');
  });

  it('returns null for past dates', () => {
    const result = extraerFechaLejana('Quiero agendar para el 15/07/2020');
    assert.equal(result, null, 'past dates should be null');
  });

  it('returns null for text with no date', () => {
    const result = extraerFechaLejana('Hola, quiero agendar un corte');
    assert.equal(result, null, 'no date found');
  });

  it('returns null for empty string', () => {
    const result = extraerFechaLejana('');
    assert.equal(result, null);
  });
});
