import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PROVIDERS, CODIGO_PATRONES, TIMEOUT_MS, MAX_TOKENS, TEMPERATURE, MAX_HISTORY_MESSAGES } from '../constants.js';

describe('constants', () => {
  it('PROVIDERS is a non-empty array', () => {
    assert.ok(Array.isArray(PROVIDERS));
    assert.ok(PROVIDERS.length > 0);
  });

  it('each provider has required fields', () => {
    for (const p of PROVIDERS) {
      assert.ok(typeof p.name === 'string' && p.name.length > 0, `provider missing name`);
      assert.ok(typeof p.url === 'string' && p.url.length > 0, `${p.name}: missing url`);
      assert.ok(typeof p.model === 'string' && p.model.length > 0, `${p.name}: missing model`);
    }
  });

  it('cerebras is first in provider order', () => {
    assert.equal(PROVIDERS[0].name, 'cerebras');
  });

  it('CODIGO_PATRONES has 4 patterns for each action type', () => {
    assert.equal(CODIGO_PATRONES.length, 4);
  });

  it('each CODIGO_PATRONES is a valid RegExp', () => {
    for (const p of CODIGO_PATRONES) {
      assert.ok(p instanceof RegExp);
    }
  });

  it('constants have sensible defaults', () => {
    assert.ok(TIMEOUT_MS > 0);
    assert.ok(MAX_TOKENS > 0);
    assert.ok(TEMPERATURE > 0 && TEMPERATURE <= 1);
    assert.ok(MAX_HISTORY_MESSAGES > 0);
  });
});
