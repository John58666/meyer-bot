import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getProvidersWithKeys, callWithFallback } from '../llm-chain.js';

describe('llm-chain', () => {
  it('getProvidersWithKeys returns all providers', () => {
    const providers = getProvidersWithKeys();
    assert.ok(providers.length > 0);
    assert.equal(providers[0].name, 'cerebras');
    assert.ok(providers.every((p) => typeof p.name === 'string'));
    assert.ok(providers.every((p) => typeof p.url === 'string'));
  });

  it('callWithFallback returns degraded message when no API keys', async () => {
    // Pass providers with empty keys to force degradation
    const providers = getProvidersWithKeys().map((p) => ({ ...p, key: '' }));
    const messages = [
      { role: 'system' as const, content: 'Eres un asistente.' },
      { role: 'user' as const, content: 'Hola' },
    ];
    const result = await callWithFallback(messages, { providers });
    assert.equal(result.provider, 'none');
    assert.ok(result.result.content.length > 0);
    assert.ok(result.errorLog.includes('sin API key'));
  });

  it('callWithFallback does not throw even when all providers fail', async () => {
    const providers = getProvidersWithKeys().map((p) => ({ ...p, key: '' }));
    const result = await callWithFallback([], { providers });
    assert.equal(result.provider, 'none');
    assert.ok(result.result.content.length > 0);
  });

  it('skips providers without key in errorLog', async () => {
    const providers = getProvidersWithKeys().map((p) => ({ ...p, key: '' }));
    const result = await callWithFallback([], { providers });
    assert.ok(result.errorLog.length > 0);
    assert.ok(result.errorLog.includes('sin API key'));
  });
});
