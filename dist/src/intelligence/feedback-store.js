/**
 * FeedbackStore - persistent storage for Why+How feedback entries.
 * Implements Memory Persistence Pattern 1 (dual storage: memory + disk).
 * Local memory always wins. FIFO eviction with max 200 entries.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
export class FeedbackStore {
    entries = [];
    MAX_ENTRIES = 200;
    DATA_FILE = 'feedback-store.json';
    dataDir;
    loadPromise = null;
    constructor(dataDir) {
        this.dataDir = dataDir;
        // Fire-and-forget async load - errors caught silently
        this.loadPromise = this.load().catch(err => {
            console.error('[FeedbackStore] Load failed:', err);
        });
    }
    // Ensure load completes before any operation
    async ensureLoaded() {
        if (this.loadPromise) {
            await this.loadPromise;
            this.loadPromise = null;
        }
    }
    add(entry) {
        // Fire-and-forget: don't await ensureLoaded (performance)
        this.ensureLoaded().catch(() => { });
        const full = { ...entry, timestamp: Date.now() };
        this.entries.push(full);
        if (this.entries.length > this.MAX_ENTRIES) {
            this.entries.shift(); // FIFO eviction
        }
        this.persist().catch(err => {
            console.error('[FeedbackStore] Persist failed:', err);
        });
        return full;
    }
    search(trigger) {
        return this.entries.filter(e => e.trigger.includes(trigger) || e.what.includes(trigger));
    }
    getRelevantForSkill(skillSlug, limit = 3) {
        return this.entries
            .filter(e => e.trigger === skillSlug || e.trigger.includes(skillSlug))
            .slice(-10)
            .slice(-limit);
    }
    getAll() {
        return [...this.entries];
    }
    async ensureDataDir() {
        if (!existsSync(this.dataDir)) {
            await mkdir(this.dataDir, { recursive: true });
        }
    }
    async persist() {
        try {
            await this.ensureDataDir();
            const filePath = join(this.dataDir, this.DATA_FILE);
            await writeFile(filePath, JSON.stringify(this.entries, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('[FeedbackStore] Persist error:', err);
        }
    }
    async load() {
        try {
            await this.ensureDataDir();
            const filePath = join(this.dataDir, this.DATA_FILE);
            if (!existsSync(filePath))
                return;
            const raw = await readFile(filePath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                this.entries = parsed;
            }
        }
        catch (err) {
            console.error('[FeedbackStore] Load error:', err);
        }
    }
}
//# sourceMappingURL=feedback-store.js.map