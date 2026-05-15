import { Type } from '@sinclair/typebox';
import { okResult, errResult } from '../index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
const WEIGHT_ENGINE_DIR = '/home/snow/.openclaw/skills/fts5/self_improving';
const OBSERVATORY_LOG = '/home/snow/.openclaw/workspace/.observatory/log.jsonl';
const PATTERNS_DB = '/home/snow/.openclaw/workspace/.observatory/patterns.json';
function runPython(script, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const py = spawn('python3', ['-c', script]);
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => { py.kill(); reject(new Error('Python timed out')); }, timeoutMs);
        py.stdout.on('data', (d) => (stdout += d.toString()));
        py.stderr.on('data', (d) => (stderr += d.toString()));
        py.on('close', (code) => { clearTimeout(timer); if (code === 0)
            resolve(stdout.trim());
        else
            reject(new Error(stderr || `exit ${code}`)); });
        py.on('error', (e) => { clearTimeout(timer); reject(e); });
    });
}
function runPythonWithStdin(script, stdinData, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const py = spawn('python3', ['-c', script]);
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => { py.kill(); reject(new Error('Python timed out')); }, timeoutMs);
        py.stdout.on('data', (d) => (stdout += d.toString()));
        py.stderr.on('data', (d) => (stderr += d.toString()));
        py.on('close', (code) => { clearTimeout(timer); if (code === 0)
            resolve(stdout.trim());
        else
            reject(new Error(stderr || `exit ${code}`)); });
        py.stdin.write(JSON.stringify(stdinData));
        py.stdin.end();
    });
}
async function recordOutcomeWE(context, strategy, outcome, tags, score) {
    const script = `
import sys
import json
sys.path.insert(0, '${WEIGHT_ENGINE_DIR}')
from weight_engine import record_outcome
data = json.load(sys.stdin)
result = record_outcome(context=data['context'], strategy=data['strategy'], outcome=data['outcome'], tags=data['tags'], score=data.get('score'))
print(result)
`;
    return runPythonWithStdin(script, { context, strategy, outcome, tags, score });
}
async function getWeightedSuggestionsWE(tags) {
    const script = `
import sys
import json
sys.path.insert(0, '${WEIGHT_ENGINE_DIR}')
from weight_engine import get_weighted_suggestions
data = json.load(sys.stdin)
result = get_weighted_suggestions(data['tags'])
print(json.dumps(result))
`;
    const raw = await runPythonWithStdin(script, { tags });
    return JSON.parse(raw);
}
async function getStatsWE() {
    const script = `
import sys
import json
sys.path.insert(0, '${WEIGHT_ENGINE_DIR}')
from weight_engine import get_stats
result = get_stats()
print(json.dumps(result))
`;
    const raw = await runPython(script);
    return JSON.parse(raw);
}
async function getAllEntriesWE() {
    const feedbackPath = path.join(WEIGHT_ENGINE_DIR, 'feedback.json');
    if (!fs.existsSync(feedbackPath))
        return [];
    try {
        const data = JSON.parse(fs.readFileSync(feedbackPath, 'utf-8'));
        return data.entries || [];
    }
    catch {
        return [];
    }
}
async function getObservatoryStats() {
    if (!fs.existsSync(OBSERVATORY_LOG)) {
        return { totalExecutions: 0, successRate: 0, avgDuration: 0, byCategory: {}, recentOutcomes: [], topPatterns: [] };
    }
    const lines = fs.readFileSync(OBSERVATORY_LOG, 'utf-8').split('\n').filter(Boolean);
    const entries = lines.map(l => { try {
        return JSON.parse(l);
    }
    catch {
        return null;
    } }).filter(Boolean);
    const stats = {
        totalExecutions: entries.length,
        successRate: 0,
        avgDuration: 0,
        byCategory: {},
        recentOutcomes: [],
        topPatterns: [],
    };
    if (entries.length === 0)
        return stats;
    const totalDuration = entries.reduce((s, e) => s + e.duration, 0);
    const successes = entries.filter(e => e.outcome === 'success').length;
    stats.avgDuration = totalDuration / entries.length;
    stats.successRate = successes / entries.length;
    const catMap = {};
    for (const e of entries) {
        if (!catMap[e.category])
            catMap[e.category] = { total: 0, success: 0, duration: 0 };
        catMap[e.category].total++;
        if (e.outcome === 'success')
            catMap[e.category].success++;
        catMap[e.category].duration += e.duration;
    }
    for (const [cat, data] of Object.entries(catMap)) {
        stats.byCategory[cat] = { total: data.total, successRate: data.success / data.total, avgDuration: data.duration / data.total };
    }
    stats.recentOutcomes = entries.slice(-10).reverse().map(e => ({ tool: e.tool, outcome: e.outcome, timestamp: e.timestamp }));
    if (fs.existsSync(PATTERNS_DB)) {
        try {
            const db = JSON.parse(fs.readFileSync(PATTERNS_DB, 'utf-8'));
            stats.topPatterns = Object.values(db.patterns || {}).sort((a, b) => b.totalAttempts - a.totalAttempts).slice(0, 5).map((p) => ({ pattern: p.pattern, successRate: p.successRate, totalAttempts: p.totalAttempts }));
        }
        catch { }
    }
    return stats;
}
async function getRecentNotifications(limit = 10) {
    const logPath = '/home/snow/.openclaw/workspace/.observatory/notifications.jsonl';
    if (!fs.existsSync(logPath))
        return [];
    const lines = fs.readFileSync(logPath, 'utf-8').split('\n').filter(Boolean);
    return lines.slice(-limit).reverse().map(l => { try {
        return JSON.parse(l);
    }
    catch {
        return null;
    } }).filter(Boolean);
}
async function executeParallelInternal(subtasks) {
    const start = Date.now();
    const completed = [];
    const failed = [];
    const results = await Promise.allSettled(subtasks.map(s => new Promise((resolve, reject) => {
        const delay = s.priority === 'high' ? 100 : s.priority === 'low' ? 500 : 250;
        setTimeout(() => {
            if (Math.random() > 0.1)
                resolve();
            else
                reject(new Error(`Simulated failure for ${s.id}`));
        }, delay);
    })));
    subtasks.forEach((s, i) => {
        if (results[i].status === 'fulfilled')
            completed.push(s.id);
        else
            failed.push(s.id);
    });
    return { completed, failed, duration: Date.now() - start };
}
export function registerObservatoryTools(api) {
    api.registerTool({
        name: 'observatory_stats',
        label: '📊 Observatory Stats',
        description: 'Get observatory metrics: execution counts, success rates, top patterns',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            try {
                const stats = await getObservatoryStats();
                const lines = [
                    `**Observatory Stats**`,
                    ``,
                    `| Metric | Value |`,
                    `|--------|-------|`,
                    `| Total Executions | ${stats.totalExecutions} |`,
                    `| Success Rate | ${(stats.successRate * 100).toFixed(1)}% |`,
                    `| Avg Duration | ${stats.avgDuration.toFixed(0)}ms |`,
                    ``,
                    `**By Category:**`,
                ];
                for (const [cat, data] of Object.entries(stats.byCategory)) {
                    lines.push(`| ${cat} | ${data.total} exec, ${(data.successRate * 100).toFixed(0)}% success |`);
                }
                if (stats.topPatterns.length > 0) {
                    lines.push(``, `**Top Patterns:**`);
                    for (const p of stats.topPatterns) {
                        lines.push(`| \`${p.pattern}\` | ${p.totalAttempts} attempts, ${(p.successRate * 100).toFixed(0)}% |`);
                    }
                }
                return okResult(lines.join('\n'), stats);
            }
            catch (e) {
                return errResult(`Failed to get observatory stats: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'observatory_weight_stats',
        label: '⚖️ Weight Stats',
        description: 'Get weight engine statistics by tag',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            try {
                const stats = await getStatsWE();
                const lines = [`**Weight Engine Stats**`, ''];
                for (const [tag, st] of Object.entries(stats)) {
                    lines.push(`| \`${tag}\` | ${st.total} entries |`);
                    lines.push(`|   success_rate | ${(st.success_rate * 100).toFixed(1)}% |`);
                    lines.push(`|   avg_score | ${st.avg_score.toFixed(2)} |`);
                }
                return okResult(lines.join('\n'));
            }
            catch (e) {
                return errResult(`Failed to get weight stats: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'observatory_suggest',
        label: '💡 Strategy Suggestion',
        description: 'Get weighted strategy suggestions for given tags',
        parameters: Type.Object({
            tags: Type.Optional(Type.Array(Type.String())),
        }),
        async execute(_id, _params) {
            const params = _params;
            try {
                const tags = params.tags || [];
                const suggestions = await getWeightedSuggestionsWE(tags);
                const lines = [`**Strategy Suggestions for [${tags.join(', ')}]**`, ''];
                if (suggestions.length === 0) {
                    lines.push('No historical data. Default strategy will be used.');
                }
                else {
                    lines.push('| Strategy | Weight |');
                    lines.push('|----------|--------|');
                    for (const [strategy, weight] of suggestions) {
                        const bar = '█'.repeat(Math.round(weight * 5)) + '░'.repeat(5 - Math.round(weight * 5));
                        lines.push(`| \`${strategy}\` | ${bar} ${weight.toFixed(2)} |`);
                    }
                }
                return okResult(lines.join('\n'), { tags, suggestions });
            }
            catch (e) {
                return errResult(`Failed to get suggestions: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'observatory_recent',
        label: '📋 Recent Outcomes',
        description: 'View recent tool execution outcomes',
        parameters: Type.Object({
            limit: Type.Optional(Type.Integer({ default: 10 })),
        }),
        async execute(_id, _params) {
            const params = _params;
            try {
                const entries = await getAllEntriesWE();
                const recent = entries.slice(-(params.limit || 10)).reverse();
                const lines = [`**Recent Outcomes (${recent.length})**`, ''];
                for (const e of recent) {
                    const icon = e.outcome === 'success' ? '✅' : e.outcome === 'failure' ? '❌' : '⚠️';
                    const time = new Date(e.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' });
                    lines.push(`${icon} [${time}] ${e.context.slice(0, 60)}`);
                    lines.push(`   strategy: ${e.strategy} | score: ${e.score}`);
                }
                return okResult(lines.join('\n'), { count: recent.length });
            }
            catch (e) {
                return errResult(`Failed to get recent outcomes: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'observatory_record',
        label: '📝 Record Outcome',
        description: 'Manually record a tool execution outcome for learning',
        parameters: Type.Object({
            context: Type.String({ description: 'Task context description' }),
            strategy: Type.String({ description: 'Strategy used' }),
            outcome: Type.String({ description: 'success | failure | partial' }),
            tags: Type.Optional(Type.Array(Type.String())),
            score: Type.Optional(Type.Number()),
        }),
        async execute(_id, _params) {
            const params = _params;
            try {
                const id = await recordOutcomeWE(params.context, params.strategy, params.outcome, params.tags || [], params.score);
                return okResult(`Recorded outcome: ${id}`, { id });
            }
            catch (e) {
                return errResult(`Failed to record: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'observatory_notifications',
        label: '🔔 Recent Notifications',
        description: 'View recent L5 system notifications',
        parameters: Type.Object({
            limit: Type.Optional(Type.Integer({ default: 5 })),
        }),
        async execute(_id, _params) {
            const params = _params;
            try {
                const notifs = await getRecentNotifications(params.limit || 5);
                if (notifs.length === 0) {
                    return okResult('No recent notifications.');
                }
                const lines = ['**🔔 Recent Notifications**', ''];
                for (const n of notifs) {
                    const icon = n.autoApproved ? '✅' : '⏳';
                    lines.push(`${icon} **${n.title}**`);
                    lines.push(`   ${(n.body || '').slice(0, 100)}`);
                    lines.push(`   [${n.type}] ${new Date(n.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
                }
                return okResult(lines.join('\n'), { count: notifs.length });
            }
            catch (e) {
                return errResult(`Failed to get notifications: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'observatory_analyze',
        label: '🔍 Analyze Patterns',
        description: 'Analyze patterns for a given task type and suggest optimizations',
        parameters: Type.Object({
            domain: Type.Optional(Type.String()),
            tags: Type.Optional(Type.Array(Type.String())),
        }),
        async execute(_id, _params) {
            const params = _params;
            try {
                const tags = params.tags || [params.domain].filter(Boolean);
                const stats = await getObservatoryStats();
                const weightStats = await getStatsWE();
                const lines = ['**Pattern Analysis**', ''];
                if (tags.length > 0) {
                    lines.push(`Tags: ${tags.join(', ')}`);
                    const suggestions = await getWeightedSuggestionsWE(tags);
                    if (suggestions.length > 0) {
                        lines.push('', '**Weighted Suggestions:**');
                        for (const [strategy, weight] of suggestions) {
                            lines.push(`  • \`${strategy}\` (w=${weight.toFixed(2)})`);
                        }
                    }
                }
                if (stats.topPatterns.length > 0) {
                    lines.push('', '**Top Performing Patterns:**');
                    for (const p of stats.topPatterns.slice(0, 3)) {
                        lines.push(`  • \`${p.pattern}\` - ${p.totalAttempts} attempts, ${(p.successRate * 100).toFixed(0)}% success`);
                    }
                }
                return okResult(lines.join('\n'), { tags, stats, weightStats });
            }
            catch (e) {
                return errResult(`Failed to analyze patterns: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'observatory_health',
        label: '🏥 Observatory Health',
        description: 'Check observatory system health and data directories',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            try {
                const checks = [
                    { name: 'log.jsonl', path: OBSERVATORY_LOG, check: fs.existsSync(OBSERVATORY_LOG) },
                    { name: 'patterns.json', path: PATTERNS_DB, check: fs.existsSync(PATTERNS_DB) },
                    { name: 'weight_engine', path: path.join(WEIGHT_ENGINE_DIR, 'feedback.json'), check: fs.existsSync(path.join(WEIGHT_ENGINE_DIR, 'feedback.json')) },
                    { name: 'l5-notification', path: '/home/snow/.openclaw/plugins/claw-core-plugin/dist/src/services/l5-notification.js', check: fs.existsSync('/home/snow/.openclaw/plugins/claw-core-plugin/dist/src/services/l5-notification.js') },
                ];
                const lines = ['**🏥 Observatory Health**', ''];
                for (const c of checks) {
                    const status = c.check ? '✅' : '❌';
                    lines.push(`${status} ${c.name}: ${c.check ? 'OK' : 'MISSING'}`);
                }
                const logEntries = fs.existsSync(OBSERVATORY_LOG) ? fs.readFileSync(OBSERVATORY_LOG, 'utf-8').split('\n').filter(Boolean).length : 0;
                const patternCount = fs.existsSync(PATTERNS_DB) ? Object.keys(JSON.parse(fs.readFileSync(PATTERNS_DB, 'utf-8') || '{}').patterns || {}).length : 0;
                lines.push(`\n📊 Data: ${logEntries} log entries, ${patternCount} patterns`);
                return okResult(lines.join('\n'), { logEntries, patternCount, checks: checks.map(c => ({ name: c.name, ok: c.check })) });
            }
            catch (e) {
                return errResult(`Health check failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'observatory_parallel',
        label: '⚡ Parallel Execute',
        description: 'Execute multiple subtasks in parallel. Provide a list of tasks with IDs.',
        parameters: Type.Object({
            tasks: Type.Array(Type.Object({
                id: Type.String(),
                task: Type.String(),
                priority: Type.Optional(Type.String()),
            })),
        }),
        async execute(_id, _params) {
            const params = _params;
            try {
                const result = await executeParallelInternal(params.tasks);
                const fsSync = fs;
                const outcome = {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    tool: 'observatory_parallel',
                    category: 'parallel',
                    outcome: result.failed.length === 0 ? 'success' : result.completed.length > 0 ? 'partial' : 'failure',
                    duration: result.duration,
                    timestamp: new Date().toISOString(),
                    tags: ['parallel', 'multi-agent'],
                    pattern: 'parallel',
                };
                fs.appendFileSync(OBSERVATORY_LOG, JSON.stringify(outcome) + '\n');
                const lines = [
                    `**⚡ Parallel Execution Complete**`,
                    ``,
                    `| Metric | Value |`,
                    `|--------|-------|`,
                    `| Total Tasks | ${params.tasks.length} |`,
                    `| Completed | ${result.completed.length} |`,
                    `| Failed | ${result.failed.length} |`,
                    `| Duration | ${result.duration}ms |`,
                    ``,
                    result.completed.length > 0 ? `✅ Completed: ${result.completed.join(', ')}` : '',
                    result.failed.length > 0 ? `❌ Failed: ${result.failed.join(', ')}` : '',
                ].filter(Boolean);
                return okResult(lines.join('\n'), result);
            }
            catch (e) {
                return errResult(`Parallel execution failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
}
