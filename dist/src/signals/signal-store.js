import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
function success(data) {
    return { ok: true, data };
}
function failure(error) {
    return { ok: false, error };
}
export class SignalStoreError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'SignalStoreError';
    }
}
export class SignalStore {
    signals = new Map();
    diskPath;
    writeTimer = null;
    DEBOUNCE_MS = 500;
    constructor(dataPath) {
        this.diskPath = join(dataPath, 'signals.json');
    }
    async init() {
        await mkdir(dirname(this.diskPath), { recursive: true });
        await this.loadFromDisk();
    }
    async loadFromDisk() {
        try {
            const content = await readFile(this.diskPath, 'utf-8');
            const data = JSON.parse(content);
            for (const [id, signal] of Object.entries(data.signals ?? {})) {
                this.signals.set(id, signal);
            }
        }
        catch {
        }
    }
    async persistToDisk() {
        if (this.writeTimer !== null) {
            clearTimeout(this.writeTimer);
        }
        this.writeTimer = setTimeout(async () => {
            try {
                const data = {
                    signals: Object.fromEntries(this.signals),
                    updatedAt: Date.now(),
                };
                await writeFile(this.diskPath, JSON.stringify(data, null, 2), 'utf-8');
            }
            catch (err) {
                console.error('[SignalStore] Failed to persist to disk:', err);
            }
            this.writeTimer = null;
        }, this.DEBOUNCE_MS);
    }
    async add(input) {
        const id = this.generateId(input);
        const signal = {
            id,
            ...input,
            timestamp: Date.now(),
        };
        this.signals.set(id, signal);
        await this.persistToDisk();
        return success(signal);
    }
    get(id) {
        return this.signals.get(id);
    }
    getAll(maxAgeMs = 24 * 60 * 60 * 1000) {
        const now = Date.now();
        const signals = [];
        for (const signal of this.signals.values()) {
            if (now - signal.timestamp <= maxAgeMs) {
                signals.push(signal);
            }
        }
        return signals.sort((a, b) => b.timestamp - a.timestamp);
    }
    getBySymbol(symbol) {
        const now = Date.now();
        const signals = [];
        for (const signal of this.signals.values()) {
            if (signal.symbol === symbol && now - signal.timestamp <= 24 * 60 * 60 * 1000) {
                signals.push(signal);
            }
        }
        return signals.sort((a, b) => b.timestamp - a.timestamp);
    }
    async remove(id) {
        if (!this.signals.has(id)) {
            return failure(new Error(`Signal not found: ${id}`));
        }
        this.signals.delete(id);
        await this.persistToDisk();
        return success(undefined);
    }
    async clear() {
        this.signals.clear();
        await this.persistToDisk();
    }
    size() {
        return this.getAll().length;
    }
    async flush() {
        if (this.writeTimer !== null) {
            clearTimeout(this.writeTimer);
            this.writeTimer = null;
        }
        try {
            const data = {
                signals: Object.fromEntries(this.signals),
                updatedAt: Date.now(),
            };
            await writeFile(this.diskPath, JSON.stringify(data, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('[SignalStore] Flush failed:', err);
        }
    }
    generateId(input) {
        const raw = `${input.symbol}:${input.side}:${Date.now()}:${Math.random()}`;
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            const char = raw.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const ts = Date.now().toString(36);
        const rand = Math.random().toString(36).substring(2, 6);
        return `sig_${ts}_${Math.abs(hash).toString(36).substring(0, 4)}${rand}`;
    }
}
