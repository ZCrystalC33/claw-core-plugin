/**
 * Signal Webhook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SignalWebhook } from './webhook.js';
import type { Signal } from './signal-schema.js';

describe('SignalWebhook', () => {
  const mockSignal: Signal = {
    id: 'sig_test_001',
    symbol: 'BTCUSDT',
    side: 'long',
    entry_price: 50000,
    stop_loss: 49000,
    take_profit: 52000,
    confidence: 85,
    timestamp: Date.now(),
    source: 'test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('push()', () => {
    it('should build correct Freqtrade payload for long signal', async () => {
      const webhook = new SignalWebhook({ url: 'http://localhost:8080/webhook', maxRetries: 1, timeoutMs: 5000 });

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await webhook.push(mockSignal);
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);

      const calledWith = fetchMock.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(calledWith.body as string);
      expect(body.action).toBe('buy');
      expect(body.pair).toBe('BTCUSDT');
      expect(body.limit).toBe(50000);
      expect(body.signal).toBeDefined();
    });

    it('should build correct Freqtrade payload for short signal', async () => {
      const shortSignal: Signal = { ...mockSignal, side: 'short' };
      const webhook = new SignalWebhook({ url: 'http://localhost:8080/webhook', maxRetries: 1, timeoutMs: 5000 });

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await webhook.push(shortSignal);
      expect(result.success).toBe(true);

      const calledWith = fetchMock.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(calledWith.body as string);
      expect(body.action).toBe('sell');
    });

    it('should retry on failure and eventually fail', async () => {
      const webhook = new SignalWebhook({ url: 'http://localhost:8080/webhook', maxRetries: 3, timeoutMs: 5000 });

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'server error' }), { status: 500 })
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await webhook.push(mockSignal);
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.responseCode).toBe(500);
    });

    it('should include Authorization header when secret is set', async () => {
      const webhook = new SignalWebhook({
        url: 'http://localhost:8080/webhook',
        secret: 'mysecret',
        maxRetries: 1,
        timeoutMs: 5000,
      });

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', fetchMock);

      await webhook.push(mockSignal);

      const calledWith = fetchMock.mock.calls[0][1] as RequestInit;
      expect(calledWith.headers).toHaveProperty('Authorization', 'Bearer mysecret');
    });

    it('should handle network errors gracefully', async () => {
      const webhook = new SignalWebhook({ url: 'http://localhost:8080/webhook', maxRetries: 2, timeoutMs: 5000 });

      const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      vi.stubGlobal('fetch', fetchMock);

      const result = await webhook.push(mockSignal);
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(result.error).toContain('ECONNREFUSED');
    });
  });

  describe('setUrl()', () => {
    it('should update the webhook URL', () => {
      const webhook = new SignalWebhook({ url: 'http://old.url/webhook' });
      webhook.setUrl('http://new.url/webhook');
      expect(webhook.getConfig().url).toBe('http://new.url/webhook');
    });
  });

  describe('pushCustom()', () => {
    it('should push a custom payload', async () => {
      const webhook = new SignalWebhook({ url: 'http://localhost:8080/webhook', maxRetries: 1, timeoutMs: 5000 });

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await webhook.pushCustom({ action: 'buy', pair: 'ETHUSDT', limit: 3000 });
      expect(result.success).toBe(true);

      const calledWith = fetchMock.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(calledWith.body as string);
      expect(body.pair).toBe('ETHUSDT');
    });
  });
});
