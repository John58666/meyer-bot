import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { neutralizador } from '../validation.js';

describe('validation — neutralizador (B17)', () => {
  it('neutralizes CANCELAR_CITA code when no active session', () => {
    const result = neutralizador('CANCELAR_CITA|42', false);
    assert.equal(result.neutralized, true);
    assert.ok(!result.content.includes('CANCELAR_CITA'));
    assert.ok(result.rawOriginal !== undefined);
  });

  it('does NOT neutralize GESTIONAR_CITA when no active session', () => {
    const result = neutralizador('GESTIONAR_CITA|cancelar', false);
    assert.equal(result.neutralized, false);
    assert.equal(result.content, 'GESTIONAR_CITA|cancelar');
  });

  it('does NOT neutralize when session is active', () => {
    const result = neutralizador('CANCELAR_CITA|42', true);
    assert.equal(result.neutralized, false);
    assert.equal(result.content, 'CANCELAR_CITA|42');
  });

  it('neutralizes short cancel-like text without session', () => {
    const result = neutralizador(
      'Tu cita ha sido cancelada correctamente',
      false,
    );
    assert.equal(result.neutralized, true);
  });

  it('passes normal conversation text unchanged', () => {
    const input = 'Hola, quiero agendar un corte para el martes.';
    const result = neutralizador(input, false);
    assert.equal(result.neutralized, false);
    assert.equal(result.content, input);
  });
});
