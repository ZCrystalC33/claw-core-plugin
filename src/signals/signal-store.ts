/**
 * Signal Store - In-memory + disk persistence for signals
 * 
 * Pattern: Dual-write (memory first, then disk)
 * Pattern 9: Typed IDs + disk output + two-phase eviction
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Signal, SignalCreateInput, SignalStoreData } from './signal-schema.js';

// ============================================================================
// Result Type (local copy from @zcrystal/evo/core/result)
// ============================================================================

interface Success<T> {
  readonly ok: true;
  readonly data: T;
}

interface Failure {
  readonly ok: false;
  readonly error: unknown;
}

type Result<T> = Success<T> | Failure;

function success<T>(data: T): Success<T> {
  return { ok: true, data };
}

function failure(error: unknown): Failure {
  return { ok: false, error };
}

// ============================================================================
// Errors
// ============================================================================

export class SignalStoreError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SignalStoreError';
  }
}

// ============================================================================
// Signal Store
// ============================================================================

export class SignalStore {
  private signals: Map<string, Signal> = new Map();
  private diskPath: string;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 500;

  constructor(dataPath: string) {
    this.diskPath = join(dataPath, 'signals.json');
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  async init(): Promise<void> {
    await mkdir(dirname(this.diskPath), { recursive: true });
    await this.loadFromDisk();
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const content = await readFile(this.diskPath, 'utf-8');
      const data = JSON.parse(content) as SignalStoreData;
      for (const [id, signal] of Object.entries(data.signals ?? {})) {
        this.signals.set(id, signal);
      }
    } catch {
      // File doesn't exist yet - this is fine for a fresh start
    }
  }

  private async persistToDisk(): Promise<void> {
    // Debounce writes
    if (this.writeTimer !== null) {
      clearTimeout(this.writeTimer);
    }
    this.writeTimer = setTimeout(async () => {
      try {
        const data: SignalStoreData = {
          signals: Object.fromEntries(this.signals),
          updatedAt: Date.now(),
        };
        await writeFile(this.diskPath, JSON.stringify(data, null, 2), 'utf-8');
      } catch (err) {
        console.error('[SignalStore] Failed to persist to disk:', err);
      }
      this.writeTimer = null;
    }, this.DEBOUNCE_MS);
  }

  // --------------------------------------------------------------------------
  // CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * Add a new signal. Returns the created signal with generated id.
   */
  async add(input: SignalCreateInput): Promise<Result<Signal>> {
    const id = this.generateId(input);
    const signal: Signal = {
      id,
      ...input,
      timestamp: Date.now(),
    };
    this.signals.set(id, signal);
    await this.persistToDisk();
    return success(signal);
  }

  /**
   * Get a signal by id.
   */
  get(id: string): Signal | undefined {
    return this.signals.get(id);
  }

  /**
   * Get all active (non-expired) signals.
   * A signal is considered expired if older than maxAgeMs (default: 24h).
   */
  getAll(maxAgeMs = 24 * 60 * 60 * 1000): Signal[] {
    const now = Date.now();
    const signals: Signal[] = [];
    for (const signal of this.signals.values()) {
      if (now - signal.timestamp <= maxAgeMs) {
        signals.push(signal);
      }
    }
    return signals.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get signals by symbol.
   */
  getBySymbol(symbol: string): Signal[] {
    const now = Date.now();
    const signals: Signal[] = [];
    for (const signal of this.signals.values()) {
      if (signal.symbol === symbol && now - signal.timestamp <= 24 * 60 * 60 * 1000) {
        signals.push(signal);
      }
    }
    return signals.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Remove a signal by id.
   */
  async remove(id: string): Promise<Result<void>> {
    if (!this.signals.has(id)) {
      return failure(new Error(`Signal not found: ${id}`));
    }
    this.signals.delete(id);
    await this.persistToDisk();
    return success(undefined);
  }

  /**
   * Clear all signals.
   */
  async clear(): Promise<void> {
    this.signals.clear();
    await this.persistToDisk();
  }

  /**
   * Get count of active signals.
   */
  size(): number {
    return this.getAll().length;
  }

  // --------------------------------------------------------------------------
  // Graceful Shutdown
  // --------------------------------------------------------------------------

  /**
   * Flush pending writes to disk. Call on shutdown.
   */
  async flush(): Promise<void> {
    if (this.writeTimer !== null) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    // Synchronous write bypasses debounce
    try {
      const data: SignalStoreData = {
        signals: Object.fromEntries(this.signals),
        updatedAt: Date.now(),
      };
      await writeFile(this.diskPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[SignalStore] Flush failed:', err);
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private generateId(input: SignalCreateInput): string {
    const raw = `${input.symbol}:${input.side}:${Date.now()}:${Math.random()}`;
    // Simple hash for a short id
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 6);
    return `sig_${ts}_${Math.abs(hash).toString(36).substring(0, 4)}${rand}`;
  }
}
