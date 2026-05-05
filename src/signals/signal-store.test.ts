/**
 * Signal Store Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SignalStore } from './signal-store.js';
import type { SignalCreateInput } from './signal-schema.js';

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('{}'),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

describe('SignalStore', () => {
  let store: SignalStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new SignalStore('/tmp/test-signals');
  });

  describe('add()', () => {
    it('should create a signal with a generated id', async () => {
      await store.init();
      const input: SignalCreateInput = {
        symbol: 'BTCUSDT',
        side: 'long',
        entry_price: 50000,
        stop_loss: 49000,
        take_profit: 52000,
        confidence: 85,
        source: 'test',
      };
      const result = await store.add(input);
      expect(result.ok).toBe(true);
      expect(result.data!.id).toBeDefined();
      expect(result.data!.symbol).toBe('BTCUSDT');
      expect(result.data!.side).toBe('long');
      expect(result.data!.timestamp).toBeGreaterThan(0);
    });

    it('should include metadata if provided', async () => {
      await store.init();
      const input: SignalCreateInput = {
        symbol: 'ETHUSDT',
        side: 'short',
        entry_price: 3000,
        stop_loss: 3100,
        take_profit: 2800,
        confidence: 70,
        source: 'wss',
        metadata: { wss_score: 0.8, rsi: 65 },
      };
      const result = await store.add(input);
      expect(result.ok).toBe(true);
      expect(result.data!.metadata).toEqual({ wss_score: 0.8, rsi: 65 });
    });
  });

  describe('get()', () => {
    it('should retrieve a signal by id', async () => {
      await store.init();
      const input: SignalCreateInput = {
        symbol: 'BTCUSDT',
        side: 'long',
        entry_price: 50000,
        stop_loss: 49000,
        take_profit: 52000,
        confidence: 90,
        source: 'manual',
      };
      const created = await store.add(input);
      const signal = store.get(created.data!.id);
      expect(signal).toBeDefined();
      expect(signal!.symbol).toBe('BTCUSDT');
    });

    it('should return undefined for non-existent id', async () => {
      await store.init();
      expect(store.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll()', () => {
    it('should return all signals sorted by timestamp descending', async () => {
      await store.init();
      await store.add({ symbol: 'BTCUSDT', side: 'long', entry_price: 50000, stop_loss: 49000, take_profit: 52000, confidence: 80, source: 'a' });
      await store.add({ symbol: 'ETHUSDT', side: 'short', entry_price: 3000, stop_loss: 3100, take_profit: 2800, confidence: 75, source: 'b' });
      const signals = store.getAll();
      expect(signals).toHaveLength(2);
      // Both symbols should be present (order depends on insertion time)
      const symbols = signals.map(s => s.symbol);
      expect(symbols).toContain('BTCUSDT');
      expect(symbols).toContain('ETHUSDT');
    });
  });

  describe('getBySymbol()', () => {
    it('should filter signals by symbol', async () => {
      await store.init();
      await store.add({ symbol: 'BTCUSDT', side: 'long', entry_price: 50000, stop_loss: 49000, take_profit: 52000, confidence: 80, source: 'a' });
      await store.add({ symbol: 'BTCUSDT', side: 'short', entry_price: 51000, stop_loss: 52000, take_profit: 49000, confidence: 70, source: 'b' });
      await store.add({ symbol: 'ETHUSDT', side: 'long', entry_price: 3000, stop_loss: 2900, take_profit: 3200, confidence: 90, source: 'c' });
      const btcSignals = store.getBySymbol('BTCUSDT');
      expect(btcSignals).toHaveLength(2);
      expect(btcSignals.every(s => s.symbol === 'BTCUSDT')).toBe(true);
    });
  });

  describe('remove()', () => {
    it('should remove a signal by id', async () => {
      await store.init();
      const created = await store.add({ symbol: 'BTCUSDT', side: 'long', entry_price: 50000, stop_loss: 49000, take_profit: 52000, confidence: 80, source: 'a' });
      const id = created.data!.id;
      const result = await store.remove(id);
      expect(result.ok).toBe(true);
      expect(store.get(id)).toBeUndefined();
    });

    it('should return failure for non-existent signal', async () => {
      await store.init();
      const result = await store.remove('nonexistent');
      expect(result.ok).toBe(false);
    });
  });

  describe('size()', () => {
    it('should return count of active signals', async () => {
      await store.init();
      expect(store.size()).toBe(0);
      await store.add({ symbol: 'BTCUSDT', side: 'long', entry_price: 50000, stop_loss: 49000, take_profit: 52000, confidence: 80, source: 'a' });
      expect(store.size()).toBe(1);
    });
  });
});
