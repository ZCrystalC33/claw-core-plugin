import * as fs from 'node:fs';
import { spawn } from 'node:child_process';
const FTS5_DB = '/home/snow/.openclaw/fts5.db';
const PATTERNS_DB = '/home/snow/.openclaw/workspace/.observatory/patterns.json';
const DOMAIN_KEYWORDS = {
    trading: ['freqtrade', 'binance', 'crypto', 'trade', 'strategy', 'backtest', 'candle', 'kline', 'indicator', 'bot'],
    code: ['typescript', 'python', 'javascript', 'rust', 'code', 'debug', 'build', 'compile', 'npm', 'import', 'function', 'refactor'],
    system: ['server', 'docker', 'nginx', 'linux', 'cron', 'service', 'process', 'memory', 'cpu', 'disk'],
    research: ['search', 'find', 'what is', 'how to', 'explain', 'analyze', 'compare'],
};
const ACTION_KEYWORDS = {
    debug: ['debug', 'fix', 'error', 'bug', 'wrong', 'broken', 'issue', 'fail'],
    build: ['build', 'create', 'implement', 'add', 'new', 'setup', 'init'],
    analyze: ['analyze', 'check', 'review', 'why', 'how', 'compare', 'evaluate'],
    execute: ['run', 'start', 'stop', 'deploy', 'execute', 'test', 'send'],
};
export function detectIntent(message) {
    const lower = message.toLowerCase();
    let domain = 'general';
    let domainConfidence = 0;
    for (const [d, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        const matches = keywords.filter(k => lower.includes(k)).length;
        const confidence = matches / keywords.length;
        if (confidence > domainConfidence) {
            domainConfidence = confidence;
            domain = d;
        }
    }
    let action = 'general';
    let actionConfidence = 0;
    for (const [a, keywords] of Object.entries(ACTION_KEYWORDS)) {
        const matches = keywords.filter(k => lower.includes(k)).length;
        const confidence = matches / keywords.length;
        if (confidence > actionConfidence) {
            actionConfidence = confidence;
            action = a;
        }
    }
    const tags = [domain, action];
    if (domain === 'code') {
        if (lower.includes('typescript') || lower.includes('ts'))
            tags.push('typescript');
        if (lower.includes('python'))
            tags.push('python');
        if (lower.includes('debug'))
            tags.push('debug');
        if (lower.includes('refactor'))
            tags.push('refactor');
    }
    if (domain === 'trading') {
        if (lower.includes('freqtrade'))
            tags.push('freqtrade');
        if (lower.includes('backtest'))
            tags.push('backtest');
        if (lower.includes('strategy'))
            tags.push('strategy');
    }
    const pastPatterns = ['before', '上次', '之前', 'earlier', 'previously', '上次是'];
    const referencesPast = pastPatterns.some(p => lower.includes(p));
    const isQuestion = ['?', '？', 'how', 'what', 'why', 'when', 'where', '誰', '怎麼', '什麼'].some(q => lower.includes(q));
    const urgent = /[A-Z]{3,}/.test(message) || message.includes('!!!');
    return { domain, action, tags, confidence: Math.max(domainConfidence, actionConfidence), urgent, isQuestion, referencesPast };
}
function searchFTS5(query, limit = 3) {
    return new Promise((resolve) => {
        if (!fs.existsSync(FTS5_DB)) {
            resolve([]);
            return;
        }
        const script = `
import sqlite3
import json
db_path = '${FTS5_DB}'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
try:
    cursor.execute('''
        SELECT channel, sender, content, timestamp, bm25(messages_fts) as score
        FROM messages_fts
        WHERE messages_fts MATCH ? AND content NOT LIKE '%NO_REPLY%' AND content NOT LIKE '%HEARTBEAT%'
        ORDER BY rank LIMIT ?
    ''', (${JSON.stringify(query)}, ${limit}))
    results = [{'channel': r[0], 'sender': r[1], 'content': r[2][:200], 'timestamp': r[3], 'score': r[4]} for r in cursor.fetchall()]
    print(json.dumps(results))
except:
    print('[]')
finally:
    conn.close()
`;
        const py = spawn('python3', ['-c', script]);
        let stdout = '';
        py.stdout.on('data', d => (stdout += d.toString()));
        py.on('close', () => { try {
            resolve(JSON.parse(stdout.trim() || '[]'));
        }
        catch {
            resolve([]);
        } });
        py.on('error', () => resolve([]));
    });
}
function loadPatterns(tags) {
    if (!fs.existsSync(PATTERNS_DB))
        return [];
    try {
        const db = JSON.parse(fs.readFileSync(PATTERNS_DB, 'utf-8'));
        const matches = [];
        for (const [key, p] of Object.entries(db.patterns)) {
            const hasMatch = tags.some(t => key.includes(t));
            if (hasMatch)
                matches.push({ pattern: key, strategy: p.strategy || 'unknown', successRate: p.successRate || 0, totalAttempts: p.totalAttempts || 0 });
        }
        return matches.sort((a, b) => b.successRate - a.successRate).slice(0, 3);
    }
    catch {
        return [];
    }
}
export function formatContextForAgent(intent, ftsResults, patterns) {
    const parts = [];
    if (intent.confidence < 0.1 && !intent.referencesPast && !intent.isQuestion) {
        return '';
    }
    if (patterns.length > 0) {
        parts.push('**📊 Known Patterns:**');
        for (const p of patterns) {
            parts.push(`  • \`${p.pattern}\` — ${(p.successRate * 100).toFixed(0)}% success (${p.totalAttempts}x)`);
        }
        parts.push('');
    }
    if (ftsResults.length > 0) {
        parts.push('**💬 Related History:**');
        for (const r of ftsResults) {
            const time = new Date(r.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            parts.push(`  • [${r.channel}] ${r.sender} (${time}): ${r.content.slice(0, 80)}...`);
        }
        parts.push('');
    }
    return parts.join('\n');
}
export async function buildMemoryContext(message) {
    const intent = detectIntent(message);
    if (intent.confidence < 0.1 && !intent.referencesPast && !intent.isQuestion) {
        return { ftsResults: [], patterns: [], injectedCount: 0 };
    }
    const searchTerms = [intent.domain, intent.action, ...intent.tags].filter(Boolean).join(' ');
    const [ftsResults, patterns] = await Promise.all([
        searchFTS5(searchTerms + ' ' + message.slice(0, 50), 3),
        Promise.resolve(loadPatterns(intent.tags)),
    ]);
    return {
        ftsResults,
        patterns,
        injectedCount: ftsResults.length + patterns.length,
    };
}
export default async function memoryObserverHook(event) {
    if (event.type !== 'message:preprocessed')
        return;
    try {
        const ctx = event.context;
        const bodyForAgent = ctx.bodyForAgent || '';
        const from = ctx.from || 'unknown';
        if (bodyForAgent.length < 5)
            return;
        const intent = detectIntent(bodyForAgent);
        if (intent.confidence < 0.1 && !intent.referencesPast && !intent.isQuestion) {
            return;
        }
        const memoryCtx = await buildMemoryContext(bodyForAgent);
        if (memoryCtx.injectedCount > 0) {
            ctx._observatoryContext = formatContextForAgent(intent, memoryCtx.ftsResults, memoryCtx.patterns);
            ctx._observatoryIntent = intent;
            console.log(`[memory-observer-hook] Injected ${memoryCtx.injectedCount} context entries for ${from}`);
        }
    }
    catch (e) {
        console.error('[memory-observer-hook] Error:', e);
    }
}
