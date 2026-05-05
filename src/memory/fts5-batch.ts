/**
 * FTS5 Batch Indexer
 * 
 * Replaces per-message spawn with batch writing to reduce process overhead.
 * 
 * Problem: Each message spawns a detached Python process (~50ms overhead)
 * Solution: Ring buffer with batch writes every 5 seconds
 * 
 * Flow:
 * 1. add_message() → push to buffer
 * 2. If buffer >= batch size OR timer elapsed → write batch
 * 3. Python receives all messages at once (JSON array)
 */

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface FTS5Message {
  sender: string;
  sender_label: string;
  content: string;
  channel: string;
  session_key: string;
  message_id: string;
  timestamp: string;
}

interface BatchWriteOptions {
  maxBatchSize: number;      // Flush when buffer reaches this size
  flushIntervalMs: number;  // Force flush every X ms
  indexerPath: string;      // Path to realtime_index.py
  tempDir: string;          // Temp file location
}

const DEFAULT_OPTIONS: BatchWriteOptions = {
  maxBatchSize: 30,          // Flush every 30 messages
  flushIntervalMs: 5000,     // Or every 5 seconds
  indexerPath: '/home/snow/.openclaw/skills/fts5/realtime_index.py',
  tempDir: '/tmp',
};

export class FTS5BatchIndexer {
  private buffer: FTS5Message[] = [];
  private flushTimer?: ReturnType<typeof setInterval>;
  private writing = false;
  private options: BatchWriteOptions;
  private onError?: (err: Error) => void;

  constructor(options: Partial<BatchWriteOptions> = {}, onError?: (err: Error) => void) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.onError = onError;
    
    // Start periodic flush timer
    this.startFlushTimer();
  }

  /**
   * Add a message to the buffer
   * Triggers flush if buffer is full
   */
  addMessage(msg: FTS5Message): void {
    this.buffer.push(msg);
    
    if (this.buffer.length >= this.options.maxBatchSize) {
      this.flush().catch(err => {
        console.warn('[FTS5Batch] Flush error:', err);
        this.onError?.(err);
      });
    }
  }

  /**
   * Flush buffer to FTS5 via Python
   */
  async flush(): Promise<void> {
    if (this.writing || this.buffer.length === 0) return;
    
    this.writing = true;
    const batch = this.buffer.splice(0, this.buffer.length); // Clear buffer atomically
    
    try {
      // Write batch to temp file (avoid command line length limits)
      const tempFile = join(this.options.tempDir, `fts5-batch-${Date.now()}.json`);
      writeFileSync(tempFile, JSON.stringify(batch), 'utf-8');
      
      // Spawn Python with batch file
      await this.spawnBatchWriter(tempFile);
    } catch (err) {
      console.warn('[FTS5Batch] Write failed:', err);
      // On failure, put messages back in buffer (best effort)
      this.buffer.unshift(...batch);
      throw err;
    } finally {
      this.writing = false;
    }
  }

  /**
   * Spawn Python process to index batch
   */
  private spawnBatchWriter(tempFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const py = spawn('python3', [
        this.options.indexerPath,
        '--batch-file',
        tempFile,
      ], {
        stdio: 'pipe',
      });

      let stderr = '';
      py.stderr.on('data', (d) => stderr += d.toString());
      
      py.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `exit ${code}`));
        }
      });
      
      py.on('error', reject);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        py.kill();
        reject(new Error('Batch write timeout'));
      }, 30_000);
    });
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) return;
    
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush().catch(err => {
          console.warn('[FTS5Batch] Timer flush error:', err);
        });
      }
    }, this.options.flushIntervalMs);
  }

  /**
   * Stop timer and flush remaining messages
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    
    // Final flush
    if (this.buffer.length > 0) {
      await this.flush();
    }
  }

  /**
   * Get current buffer size (for testing/monitoring)
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}

// Singleton instance for plugin-wide use
let globalIndexer: FTS5BatchIndexer | null = null;

export function getFTS5BatchIndexer(): FTS5BatchIndexer {
  if (!globalIndexer) {
    globalIndexer = new FTS5BatchIndexer();
  }
  return globalIndexer;
}