import * as fs from 'node:fs';
import * as path from 'node:path';
const NOTIFICATIONS_LOG = '/home/snow/.openclaw/workspace/.observatory/notifications.jsonl';
const PATTERNS_DB = '/home/snow/.openclaw/workspace/.observatory/patterns.json';
const WEIGHT_ENGINE_FEEDBACK = '/home/snow/.openclaw/skills/fts5/self_improving/feedback.json';
function ensureLogDir() {
    const dir = path.dirname(NOTIFICATIONS_LOG);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
}
export async function createNotification(notif) {
    ensureLogDir();
    const full = {
        ...notif,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
    };
    fs.appendFileSync(NOTIFICATIONS_LOG, JSON.stringify(full) + '\n');
    console.log(`[L5] Notification created: ${full.type} - ${full.title}`);
    return full;
}
export async function getRecentNotifications(limit = 20) {
    if (!fs.existsSync(NOTIFICATIONS_LOG))
        return [];
    const lines = fs.readFileSync(NOTIFICATIONS_LOG, 'utf-8').split('\n').filter(Boolean);
    return lines.slice(-limit).reverse().map(l => { try {
        return JSON.parse(l);
    }
    catch {
        return null;
    } }).filter(Boolean);
}
export async function detectEvolutionCandidates() {
    const notifications = [];
    let patterns = { version: 1, patterns: {} };
    if (fs.existsSync(PATTERNS_DB)) {
        try {
            patterns = JSON.parse(fs.readFileSync(PATTERNS_DB, 'utf-8'));
        }
        catch { }
    }
    let feedback = { entries: [] };
    if (fs.existsSync(WEIGHT_ENGINE_FEEDBACK)) {
        try {
            feedback = JSON.parse(fs.readFileSync(WEIGHT_ENGINE_FEEDBACK, 'utf-8'));
        }
        catch { }
    }
    for (const [key, p] of Object.entries(patterns.patterns)) {
        if (p.totalAttempts >= 3 && p.successRate >= 0.85) {
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
    for (const [key, p] of Object.entries(patterns.patterns)) {
        if (p.totalAttempts >= 5) {
            if (p.successRate >= 0.8) {
                notifications.push(await createNotification({
                    type: 'pattern_shift',
                    title: `✅ Pattern 確認：${key}`,
                    body: `${key} 成功率穩定在 ${(p.successRate * 100).toFixed(0)}%（${p.totalAttempts} 次執行）。已列為首選策略。`,
                    autoApproved: true,
                    tags: [p.category, 'confirmed'],
                    confidence: p.successRate,
                }));
            }
            else if (p.successRate <= 0.3) {
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
    const recentEntries = feedback.entries.slice(-10);
    if (recentEntries.length >= 5) {
        const tagCounts = {};
        for (const e of recentEntries) {
            for (const tag of e.tags) {
                if (!tagCounts[tag])
                    tagCounts[tag] = { success: 0, total: 0 };
                tagCounts[tag].total++;
                if (e.outcome === 'success')
                    tagCounts[tag].success++;
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
export function formatNotificationSummary(notifications) {
    if (notifications.length === 0)
        return '';
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
export async function runEvolutionCheck() {
    try {
        const candidates = await detectEvolutionCandidates();
        if (candidates.length > 0) {
            console.log(`[L5] Evolution check: ${candidates.length} notifications generated`);
        }
        return candidates;
    }
    catch (e) {
        console.warn('[L5] Evolution check failed:', e);
        return [];
    }
}
export async function notifyUser(title, body, type = 'milestone') {
    await createNotification({
        type,
        title,
        body,
        autoApproved: true,
        tags: ['user-notification'],
        confidence: 1.0,
    });
    console.log(`[L5:USER] ${title}: ${body}`);
}
