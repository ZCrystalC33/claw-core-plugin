/**
 * L5 Notification System
 * 
 * Handles automatic evolution notifications to the user.
 * Monitors pattern changes, strategy adjustments, and evolution candidates.
 * Auto-approves low-risk changes and notifies the user of significant events.
 * 
 * Architecture:
 *   Outcome Capture → Pattern Change Detection → Auto-Approve → User Notification
 * 
 * Notification Types:
 *   - evolution_candidate: New pattern/strategy discovered
 *   - pattern_shift: Existing pattern success rate changed significantly
 *   - strategy_adjusted: Weight engine suggests strategy change
 *   - milestone: System reached a learning milestone
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const NOTIFICATIONS_LOG = '/home/snow/.openclaw/workspace/.observatory/notifications.jsonl';
const PATTERNS_DB = '/home/snow/.openclaw/workspace/.observatory/patterns.json';
const WEIGHT_ENGINE_FEEDBACK = '/home/snow/.openclaw/skills/fts5/self_improving/feedback.json';

// ─── Notification Types ────────────────────────────────────────────────────────

export type NotificationType = 'evolution_candidate' | 'pattern_shift' | 'strategy_adjusted' | 'milestone' | 'correction';

export interface L5Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  autoApproved: boolean;
  tags: string[];
  confidence: number;
  actionTaken?: string;
}

// ─── Notification Store ───────────────────────────────────────────────────────

function ensureLogDir(): void {
  const dir = path.dirname(NOTIFICATIONS_LOG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function createNotification(notif: Omit<L5Notification, 'id' | 'timestamp'>): Promise<L5Notification> {
  ensureLogDir();
  const full: L5Notification = {
    ...notif,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  fs.appendFileSync(NOTIFICATIONS_LOG, JSON.stringify(full) + '\n');
  console.log(`[L5] Notification created: ${full.type} - ${full.title}`);
  return full;
}

export async function getRecentNotifications(limit = 20): Promise<L5Notification[]> {
  if (!fs.existsSync(NOTIFICATIONS_LOG)) return [];
  const lines = fs.readFileSync(NOTIFICATIONS_LOG, 'utf-8').split('\n').filter(Boolean);
  return lines.slice(-limit).reverse().map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

// ─── Pattern Change Detection ─────────────────────────────────────────────────

interface PatternRecord {
  pattern: string;
  category: string;
  strategy: string;
  successRate: number;
  totalAttempts: number;
  lastUpdated: string;
  avgDuration: number;
}

interface PatternsDB {
  version: number;
  patterns: Record<string, PatternRecord>;
}

interface OutcomeEntry {
  id: string;
  context: string;
  strategy: string;
  outcome: 'success' | 'failure' | 'partial';
  tags: string[];
  timestamp: string;
  score: number;
}

interface FeedbackData {
  entries: OutcomeEntry[];
}

export async function detectEvolutionCandidates(): Promise<L5Notification[]> {
  const notifications: L5Notification[] = [];

  // Load patterns
  let patterns: PatternsDB = { version: 1, patterns: {} };
  if (fs.existsSync(PATTERNS_DB)) {
    try { patterns = JSON.parse(fs.readFileSync(PATTERNS_DB, 'utf-8')); } catch { /* ignore */ }
  }

  // Load feedback
  let feedback: FeedbackData = { entries: [] };
  if (fs.existsSync(WEIGHT_ENGINE_FEEDBACK)) {
    try { feedback = JSON.parse(fs.readFileSync(WEIGHT_ENGINE_FEEDBACK, 'utf-8')); } catch { /* ignore */ }
  }

  // ─── Detection 1: High-performing new patterns ─────────────────────────────
  for (const [key, p] of Object.entries(patterns.patterns)) {
    if (p.totalAttempts >= 3 && p.successRate >= 0.85) {
      // Pattern is proven (3+ attempts, 85%+ success)
      const isNew = (Date.now() - new Date(p.lastUpdated).getTime()) < 24 * 60 * 60 * 1000;
      if (isNew) {
        notifications.push(await createNotification({
          type: 'evolution_candidate',
          title: `📈 新 Pattern 發現`,
          body: `\`${key}\` 在 ${p.totalAttempts} 次執行後達到 ${(p.successRate * 100).toFixed(0)}% 成功率。建議採納為標準策略。`,
          autoApproved: true,
          tags: [p.category, 'pattern', 'high-performer'],
          confidence: p.successRate,
          actionTaken: `Pattern ${key} marked as recommended`,
        }));
      }
    }
  }

  // ─── Detection 2: Pattern success rate shift ────────────────────────────────
  for (const [key, p] of Object.entries(patterns.patterns)) {
    if (p.totalAttempts >= 5) {
      // Only notify on significant shifts
      if (p.successRate >= 0.8) {
        notifications.push(await createNotification({
          type: 'pattern_shift',
          title: `✅ Pattern 確認：${key}`,
          body: `${key} 成功率穩定在 ${(p.successRate * 100).toFixed(0)}%（${p.totalAttempts} 次執行）。已列為首選策略。`,
          autoApproved: true,
          tags: [p.category, 'confirmed'],
          confidence: p.successRate,
        }));
      } else if (p.successRate <= 0.3) {
        notifications.push(await createNotification({
          type: 'correction',
          title: `⚠️ Pattern 需要修正：${key}`,
          body: `${key} 成功率僅 ${(p.successRate * 100).toFixed(0)}%（${p.totalAttempts} 次執行）。建議檢視策略或降級使用。`,
          autoApproved: true,
          tags: [p.category, 'low-performer', 'needs-review'],
          confidence: 1 - p.successRate,
          actionTaken: `Pattern ${key} flagged for review`,
        }));
      }
    }
  }

  // ─── Detection 3: Weight engine strategy changes ───────────────────────────
  // Analyze recent feedback entries
  const recentEntries = feedback.entries.slice(-10);
  if (recentEntries.length >= 5) {
    const tagCounts: Record<string, { success: number; total: number }> = {};
    for (const e of recentEntries) {
      for (const tag of e.tags) {
        if (!tagCounts[tag]) tagCounts[tag] = { success: 0, total: 0 };
        tagCounts[tag].total++;
        if (e.outcome === 'success') tagCounts[tag].success++;
      }
    }

    for (const [tag, counts] of Object.entries(tagCounts)) {
      if (counts.total >= 3) {
        const rate = counts.success / counts.total;
        if (rate >= 0.8) {
          notifications.push(await createNotification({
            type: 'strategy_adjusted',
            title: `💡 策略調整：${tag}`,
            body: `標籤 \`${tag}\` 近期成功率高(${rate * 100}%)。系統將優先使用相關策略。`,
            autoApproved: true,
            tags: ['strategy', tag],
            confidence: rate,
            actionTaken: `Tag ${tag} strategy weight increased`,
          }));
        }
      }
    }
  }

  return notifications;
}

// ─── Notification Summary Formatter ──────────────────────────────────────────

export function formatNotificationSummary(notifications: L5Notification[]): string {
  if (notifications.length === 0) return '';
  
  const lines = ['**🔔 L5 System Update**', ''];
  for (const n of notifications.slice(0, 5)) {
    const icon = n.type === 'evolution_candidate' ? '🚀' : 
                 n.type === 'pattern_shift' ? '📊' : 
                 n.type === 'strategy_adjusted' ? '💡' : 
                 n.type === 'correction' ? '⚠️' : '📌';
    lines.push(`${icon} **${n.title}**`);
    lines.push(`   ${n.body}`);
    lines.push('');
  }
  
  return lines.join('\n');
}

// ─── Auto-Evolution Check ──────────────────────────────────────────────────────

export async function runEvolutionCheck(): Promise<L5Notification[]> {
  try {
    const candidates = await detectEvolutionCandidates();
    if (candidates.length > 0) {
      console.log(`[L5] Evolution check: ${candidates.length} notifications generated`);
    }
    return candidates;
  } catch (e) {
    console.warn('[L5] Evolution check failed:', e);
    return [];
  }
}

// ─── User-Facing Notification ────────────────────────────────────────────────

export async function notifyUser(title: string, body: string, type: NotificationType = 'milestone'): Promise<void> {
  await createNotification({
    type,
    title,
    body,
    autoApproved: true,
    tags: ['user-notification'],
    confidence: 1.0,
  });
  
  // Also log to console for visibility
  console.log(`[L5:USER] ${title}: ${body}`);
}