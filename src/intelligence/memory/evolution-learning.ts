/**
 * Evolution Learning Persistence
 * 
 * Implements Memory Persistence Pattern 1 for Self-Evolution Engine.
 * 
 * Problem: Evolution results are in-memory only. After OpenClaw restart,
 * the engine "forgets" what worked and what didn't.
 * 
 * Solution: Persist learning to disk after each evolution cycle.
 * Load and apply learning on startup to guide future mutations.
 * 
 * Flow:
 * 1. After applyBestCandidate() → persist learning
 * 2. On engine initialize() → load learning
 * 3. During generateCandidates() → use learning hints
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface LearnedPattern {
  skillSlug: string;
  pattern: string;           // E.g., "wide stop", "MACD confirmation"
  occurrences: number;       // How many times this pattern appeared
  avgScore: number;          // Average score when this pattern was present
  lastSeen: number;         // Timestamp
  exampleContent?: string;   // Example of successful content
}

export interface EvolutionLearning {
  version: number;
  lastUpdated: number;
  patterns: LearnedPattern[];
  successfulCandidates: SuccessfulCandidate[];
  corrections: CorrectionEntry[];
}

interface SuccessfulCandidate {
  skillSlug: string;
  contentHash: string;
  content: string;
  score: number;
  appliedAt: number;
  verificationPassed: boolean;
}

interface CorrectionEntry {
  skillSlug: string;
  issue: string;
  resolution: string;
  timestamp: number;
}

const LEARNING_FILE = 'evolution-learning.json';
const CORRECTIONS_FILE = 'evolution-corrections.md';
const MAX_PATTERNS = 100;
const MAX_CANDIDATES = 50;
const LEARNING_VERSION = 1;

export class EvolutionLearningPersistence {
  private dataDir: string;
  private learning: EvolutionLearning;
  private dirty = false;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.learning = {
      version: LEARNING_VERSION,
      lastUpdated: Date.now(),
      patterns: [],
      successfulCandidates: [],
      corrections: [],
    };
  }

  /**
   * Load learning from disk (called on engine initialize)
   */
  async load(): Promise<void> {
    const filePath = join(this.dataDir, LEARNING_FILE);
    
    if (!existsSync(filePath)) {
      console.log('[EvolutionLearning] No previous learning found, starting fresh');
      return;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const loaded = JSON.parse(content) as EvolutionLearning;
      
      // Version check
      if (loaded.version !== LEARNING_VERSION) {
        console.warn('[EvolutionLearning] Learning version mismatch, starting fresh');
        return;
      }

      this.learning = loaded;
      console.log(`[EvolutionLearning] Loaded ${loaded.patterns.length} patterns, ${loaded.successfulCandidates.length} candidates`);
    } catch (err) {
      console.warn('[EvolutionLearning] Failed to load learning:', err);
    }
  }

  /**
   * Save learning to disk
   */
  async save(): Promise<void> {
    if (!this.dirty) return;

    const filePath = join(this.dataDir, LEARNING_FILE);
    
    try {
      if (!existsSync(this.dataDir)) {
        await mkdir(this.dataDir, { recursive: true });
      }
      
      this.learning.lastUpdated = Date.now();
      await writeFile(filePath, JSON.stringify(this.learning, null, 2), 'utf-8');
      this.dirty = false;
      console.log('[EvolutionLearning] Learning persisted to disk');
    } catch (err) {
      console.error('[EvolutionLearning] Failed to save learning:', err);
    }
  }

  /**
   * Record a successful candidate application
   * Called after applyBestCandidate() succeeds
   */
  async recordSuccess(
    skillSlug: string,
    content: string,
    score: number,
    verificationPassed: boolean
  ): Promise<void> {
    const contentHash = await this.hashContent(content);
    
    // Check if we already have this exact candidate
    const existing = this.learning.successfulCandidates.find(
      c => c.contentHash === contentHash
    );
    if (existing) {
      existing.score = Math.max(existing.score, score);
      existing.verificationPassed = existing.verificationPassed || verificationPassed;
      this.dirty = true;
    } else {
      // Add new successful candidate (bounded)
      if (this.learning.successfulCandidates.length >= MAX_CANDIDATES) {
        // Remove oldest
        this.learning.successfulCandidates.shift();
      }
      
      this.learning.successfulCandidates.push({
        skillSlug,
        contentHash,
        content: content.slice(0, 500), // Store preview
        score,
        appliedAt: Date.now(),
        verificationPassed,
      });
      this.dirty = true;
    }

    // Extract and record patterns from successful content
    this.extractPatterns(skillSlug, content, score);
    
    await this.save();
  }

  /**
   * Record a failed candidate (for corrections)
   */
  async recordFailure(skillSlug: string, content: string, issue: string): Promise<void> {
    this.learning.corrections.push({
      skillSlug,
      issue,
      resolution: '', // Filled in when success is found
      timestamp: Date.now(),
    });
    
    // Bound corrections
    if (this.learning.corrections.length > 100) {
      this.learning.corrections.shift();
    }
    
    this.dirty = true;
    await this.save();
    
    // Also append to corrections file for Self-Improving system
    await this.appendCorrection(skillSlug, issue, content);
  }

  /**
   * Get learning hints for a skill (used during mutation generation)
   */
  getHints(skillSlug: string): {
    successfulPatterns: string[];
    avoidPatterns: string[];
    avgSuccessfulScore: number;
  } {
    const skillPatterns = this.learning.patterns.filter(p => p.skillSlug === skillSlug);
    const skillCandidates = this.learning.successfulCandidates.filter(c => c.skillSlug === skillSlug);
    
    // Patterns that worked well (avg score > 0.6)
    const successfulPatterns = skillPatterns
      .filter(p => p.avgScore > 0.6)
      .sort((a, b) => b.avgScore - a.avgScore)
      .map(p => p.pattern);
    
    // Patterns that failed (avg score < 0.4 or marked as corrections)
    const failureIssues = this.learning.corrections
      .filter(c => c.skillSlug === skillSlug)
      .map(c => c.issue);
    
    const avgScore = skillCandidates.length > 0
      ? skillCandidates.reduce((sum, c) => sum + c.score, 0) / skillCandidates.length
      : 0.5;
    
    return {
      successfulPatterns: successfulPatterns.slice(0, 5),
      avoidPatterns: failureIssues.slice(0, 5),
      avgSuccessfulScore: avgScore,
    };
  }

  /**
   * Extract patterns from content (simple keyword extraction)
   */
  private extractPatterns(skillSlug: string, content: string, score: number): void {
    // Simple pattern extraction: look for common trading/evolution terms
    const patternKeywords = [
      'stop loss', 'stop', 'trailing', 'take profit', 'TP',
      'MACD', 'RSI', 'Bollinger', 'ATR', 'ADX',
      'momentum', 'trend', 'volatility', 'volume',
      'filter', 'confirm', 'entry', 'exit',
      'wide', 'tight', 'aggressive', 'conservative',
      'bear', 'bull', 'long', 'short',
    ];

    const foundPatterns: string[] = [];
    const lowerContent = content.toLowerCase();
    
    for (const keyword of patternKeywords) {
      if (lowerContent.includes(keyword)) {
        foundPatterns.push(keyword);
      }
    }

    // Update pattern statistics
    for (const pattern of foundPatterns) {
      const existing = this.learning.patterns.find(
        p => p.skillSlug === skillSlug && p.pattern === pattern
      );
      
      if (existing) {
        existing.occurrences++;
        existing.avgScore = (existing.avgScore * (existing.occurrences - 1) + score) / existing.occurrences;
        existing.lastSeen = Date.now();
      } else {
        if (this.learning.patterns.length < MAX_PATTERNS) {
          this.learning.patterns.push({
            skillSlug,
            pattern,
            occurrences: 1,
            avgScore: score,
            lastSeen: Date.now(),
            exampleContent: content.slice(0, 200),
          });
        }
      }
    }
  }

  /**
   * Append a correction entry for Self-Improving system
   */
  private async appendCorrection(skillSlug: string, issue: string, content: string): Promise<void> {
    const correctionsPath = join(this.dataDir, CORRECTIONS_FILE);
    
    const entry = `\n## Correction [${new Date().toISOString()}]\n\nSkill: ${skillSlug}\n\nIssue: ${issue}\n\nContent preview: ${content.slice(0, 200)}...\n\n`;
    
    try {
      await writeFile(correctionsPath, entry, { flag: 'a' });
    } catch {
      // Best effort
    }
  }

  /**
   * Simple hash for content deduplication
   */
  private async hashContent(content: string): Promise<string> {
    // Simple hash using built-in methods (no crypto dependency)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get all learning summary (for debugging/dashboard)
   */
  getSummary(): {
    totalPatterns: number;
    totalCandidates: number;
    totalCorrections: number;
    topPatterns: LearnedPattern[];
  } {
    return {
      totalPatterns: this.learning.patterns.length,
      totalCandidates: this.learning.successfulCandidates.length,
      totalCorrections: this.learning.corrections.length,
      topPatterns: this.learning.patterns
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 10),
    };
  }
}