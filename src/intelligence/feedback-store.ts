/**
 * FeedbackStore - persistent storage for Why+How feedback entries.
 * Implements Memory Persistence Pattern 1 (dual storage: memory + disk).
 * Local memory always wins. FIFO eviction with max 200 entries.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { FeedbackEntry } from './types.js';

export class FeedbackStore {
  private entries: FeedbackEntry[] = [];
  private readonly MAX_ENTRIES = 200;
  private readonly DATA_FILE = 'feedback-store.json';
  private dataDir: string;
  private loadPromise: Promise<void> | null = null;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    // Fire-and-forget async load - errors caught silently
    this.loadPromise = this.load().catch(err => {
      console.error('[FeedbackStore] Load failed:', err);
    });
  }

  // Ensure load completes before any operation
  private async ensureLoaded(): Promise<void> {
    if (this.loadPromise) {
      await this.loadPromise;
      this.loadPromise = null;
    }
  }

  add(entry: Omit<FeedbackEntry, 'timestamp'>): FeedbackEntry {
    // Fire-and-forget: don't await ensureLoaded (performance)
    this.ensureLoaded().catch(() => {});
    const full: FeedbackEntry = { ...entry, timestamp: Date.now() };
    this.entries.push(full);
    if (this.entries.length > this.MAX_ENTRIES) {
      this.entries.shift(); // FIFO eviction
    }
    this.persist().catch(err => {
      console.error('[FeedbackStore] Persist failed:', err);
    });
    return full;
  }

  search(trigger: string): FeedbackEntry[] {
    return this.entries.filter(e =>
      e.trigger.includes(trigger) || e.what.includes(trigger)
    );
  }

  getRelevantForSkill(skillSlug: string, limit = 3): FeedbackEntry[] {
    return this.entries
      .filter(e => e.trigger === skillSlug || e.trigger.includes(skillSlug))
      .slice(-10)
      .slice(-limit);
  }

  getAll(): FeedbackEntry[] {
    return [...this.entries];
  }

  private async ensureDataDir(): Promise<void> {
    if (!existsSync(this.dataDir)) {
      await mkdir(this.dataDir, { recursive: true });
    }
  }

  private async persist(): Promise<void> {
    try {
      await this.ensureDataDir();
      const filePath = join(this.dataDir, this.DATA_FILE);
      await writeFile(filePath, JSON.stringify(this.entries, null, 2), 'utf-8');
    } catch (err) {
      console.error('[FeedbackStore] Persist error:', err);
    }
  }

  private async load(): Promise<void> {
    try {
      await this.ensureDataDir();
      const filePath = join(this.dataDir, this.DATA_FILE);
      if (!existsSync(filePath)) return;
      const raw = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.entries = parsed;
      }
    } catch (err) {
      console.error('[FeedbackStore] Load error:', err);
    }
  }
}