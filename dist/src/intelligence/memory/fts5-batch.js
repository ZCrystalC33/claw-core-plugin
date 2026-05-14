import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const DEFAULT_OPTIONS = {
    maxBatchSize: 30,
    flushIntervalMs: 5000,
    indexerPath: '/home/snow/.openclaw/skills/fts5/realtime_index.py',
    tempDir: '/tmp',
};
export class FTS5BatchIndexer {
    buffer = [];
    flushTimer;
    writing = false;
    options;
    onError;
    constructor(options = {}, onError) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.onError = onError;
        this.startFlushTimer();
    }
    addMessage(msg) {
        this.buffer.push(msg);
        if (this.buffer.length >= this.options.maxBatchSize) {
            this.flush().catch(err => {
                console.warn('[FTS5Batch] Flush error:', err);
                this.onError?.(err);
            });
        }
    }
    async flush() {
        if (this.writing || this.buffer.length === 0)
            return;
        this.writing = true;
        const batch = this.buffer.splice(0, this.buffer.length);
        try {
            const tempFile = join(this.options.tempDir, `fts5-batch-${Date.now()}.json`);
            writeFileSync(tempFile, JSON.stringify(batch), 'utf-8');
            await this.spawnBatchWriter(tempFile);
        }
        catch (err) {
            console.warn('[FTS5Batch] Write failed:', err);
            this.buffer.unshift(...batch);
            throw err;
        }
        finally {
            this.writing = false;
        }
    }
    spawnBatchWriter(tempFile) {
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
                }
                else {
                    reject(new Error(stderr || `exit ${code}`));
                }
            });
            py.on('error', reject);
            setTimeout(() => {
                py.kill();
                reject(new Error('Batch write timeout'));
            }, 30_000);
        });
    }
    startFlushTimer() {
        if (this.flushTimer)
            return;
        this.flushTimer = setInterval(() => {
            if (this.buffer.length > 0) {
                this.flush().catch(err => {
                    console.warn('[FTS5Batch] Timer flush error:', err);
                });
            }
        }, this.options.flushIntervalMs);
    }
    async shutdown() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = undefined;
        }
        if (this.buffer.length > 0) {
            await this.flush();
        }
    }
    getBufferSize() {
        return this.buffer.length;
    }
}
let globalIndexer = null;
export function getFTS5BatchIndexer() {
    if (!globalIndexer) {
        globalIndexer = new FTS5BatchIndexer();
    }
    return globalIndexer;
}
