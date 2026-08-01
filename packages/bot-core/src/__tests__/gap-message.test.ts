import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeGapMessage } from '../gap-message.js';

describe('gap-message', () => {
  it('resets history when last message was >60 min ago', () => {
    const pastDate = new Date(Date.now() - 90 * 60 * 1000).toISOString();
    const result = computeGapMessage(pastDate);
    assert.equal(result.shouldResetHistory, true);
  });

  it('generates gap warning when last message was 10-60 min ago', () => {
    const pastDate = new Date(Date.now() - 25 * 60 * 1000).toISOString();
    const result = computeGapMessage(pastDate);
    assert.equal(result.shouldResetHistory, false);
    assert.ok(result.gapMessage.length > 0);
    assert.ok(result.gapMessage.includes('Pasaron mas de'));
  });

  it('returns empty gap when recent (<10 min)', () => {
    const pastDate = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const result = computeGapMessage(pastDate);
    assert.equal(result.shouldResetHistory, false);
    assert.equal(result.gapMessage, '');
  });

  it('generates retomacion message when inactividad estado is avisado', () => {
    const pastDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const result = computeGapMessage(pastDate, 'avisado');
    assert.ok(result.gapMessage.includes('retoma la conversacion'));
  });

  it('returns empty when no histUpdatedAt', () => {
    const result = computeGapMessage(null);
    assert.equal(result.shouldResetHistory, false);
    assert.equal(result.gapMessage, '');
  });
});
