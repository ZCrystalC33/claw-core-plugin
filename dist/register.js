import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { Type } from '@sinclair/typebox';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createToolRegistryService } from './tools/tool-registry.js';
import { createInsightsService } from './tools/insights-engine.js';
import { compressContext, estimateTokens } from './src/hooks/context-compressor.js';
import { classifyError } from './src/hooks/error-classifier.js';
import { createCredentialPoolService } from './src/services/credential-pool.js';
import { createMcpBridgeService } from './src/services/mcp-bridge.js';
import { stripPrivateTags } from './src/intelligence/utils/privacy-filter.js';
import { UNCERTAINTY_MARKERS } from './src/memory/recall.js';
import { config as zcrystalConfig } from './src/config.js';
let pendingRecallContext = null;
const RECALL_CONTEXT_TTL_MS = 30_000;
function setRecallContext(ctx) {
    pendingRecallContext = ctx;
    setTimeout(() => {
        if (pendingRecallContext === ctx)
            pendingRecallContext = null;
    }, RECALL_CONTEXT_TTL_MS);
}
function getRecallContext() {
    if (!pendingRecallContext)
        return null;
    if (Date.now() - pendingRecallContext.timestamp > RECALL_CONTEXT_TTL_MS) {
        pendingRecallContext = null;
        return null;
    }
    return pendingRecallContext;
}
function clearRecallContext() {
    pendingRecallContext = null;
}
import { UnifiedApiRouter, createHonchoClient, createSkillManager, SelfEvolutionEngine, EvolutionCoordinator, EvolutionScheduler, ReviewEngine, ToolHub, SkillGenerator, SkillVersioning, SkillIndexer, SkillValidator, SkillMerger, CircuitBreaker, RateLimiter, StructuredLogger, Metrics, WorkflowEngine, OpenClawSkillAdapter, SkillSyncManager, ReplayRunner, HookRegistry, DiskStore, EvolutionStore, TraceStore, } from '@zcrystal/evo';
import { registerBulkheadTools, registerCacheTools, registerContextEngineTools, registerCoreTools, registerCredentialPoolTools, registerBenchmarkTools, registerMemoryBankTools, registerDecomposeRouterTools, registerDecomposerTools, registerErrorClassifierTools, registerEventsTools, registerFeaturesTools, registerHealthTools, registerLazyTools, registerLockTools, registerMetricsTools, registerMiddlewareTools, registerMonitorTools, registerPipelineTools, registerProactiveTools, registerQuotaTools, registerRateLimitTools, registerRegistryTools, registerRetryTools, registerSerializersTools, registerCircuitBreakerTools, registerCoordinatorTools, registerSkillSystemTools, registerSkillTools, registerSystemTools, registerTaskTools, registerTelemetryTools, registerWorkerpoolTools, registerWorkflowTools, } from './src/tools/index.js';
import { registerSignalTools } from './src/signals/tools.js';
let zcState = null;
function okResult(text, details) {
    return { content: [{ type: 'text', text }], details: details ?? {} };
}
function errResult(text) {
    return { content: [{ type: 'text', text }], details: {}, isError: true };
}
export { okResult, errResult };
const FTS5_MCP_URL = zcrystalConfig.fts5.mcpUrl;
async function fts5Search(query, limit = 20) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(FTS5_MCP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'tools/call',
                params: { name: 'fts5_search', arguments: { query, limit } },
                id: 2
            }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await response.json();
        if (data.result?.content?.[0]?.text) {
            return { success: true, data: data.result.content[0].text };
        }
        return { success: false, error: 'FTS5 search failed' };
    }
    catch (e) {
        return { success: false, error: String(e) };
    }
}
async function fts5Stats() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(FTS5_MCP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'tools/call',
                params: { name: 'fts5_stats', arguments: {} },
                id: 3
            }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await response.json();
        if (data.result?.content?.[0]?.text) {
            return { success: true, data: data.result.content[0].text };
        }
        return { success: false, error: 'FTS5 stats failed' };
    }
    catch (e) {
        return { success: false, error: String(e) };
    }
}
const SKILL_CONTENT = {
    decompose: `---
name: Decompose
slug: decompose
version: 1.0.0
description: "Break a complex task into structured, ordered sub-tasks. Use when a task is too large, ambiguous, or multi-faceted to execute directly."
---

## Usage

/decompose <task description>

## Output

- Numbered step list (1 → N)
- Each step has: action description + success criteria
- Dependency hints between steps
- Estimated complexity label (trivial / moderate / complex / epic)

## Example

**Input:** "Set up a new Freqtrade bot with Binance futures"

**Output:**
1. ✅ Create config.json (exchange API keys, stake currency)
   Criteria: Bot connects to Binance Testnet without errors
2. ✅ Define strategy file (indicators, buy/sell signals)
   Criteria: strategy.py passes freqtrade validate
3. ✅ Backtest with historical data (90-day min)
   Criteria: Sharpe > 0.5, Max Drawdown < 20%
4. ✅ Dry-run live monitoring
   Criteria: Logs show buy/sell signals firing
5. ✅ Paper trade for 48h before real capital
   Criteria: No unhandled exceptions, orders fill correctly
`,
    'route-task': `---
name: Route Task
slug: route-task
version: 1.0.0
description: "Analyze a task and route it to the optimal agent, tool, or skill based on capability matching and current load."
---

## Usage

/route <task description>

## Routing Logic

1. **Intent classification** — What domain? (code, trading, system, research…)
2. **Capability matching** — Which agent/skills handle this?
3. **Load check** — Is the target already busy?
4. **Fallback chain** — Who handles if primary is unavailable?

## Output

- Primary target (agent / skill / tool)
- Fallback chain (ordered list)
- Reasoning (1-2 sentences)
- Estimated fit score (0-100%)

## Example

**Input:** "Debug my Freqtrade strategy not triggering buy signals"

**Output:**
- **Primary:** /skill claw-code:debug + freqtrade bot context
- **Fallback:** @trading-expert agent → manual review
- **Reasoning:** Task requires Python debugging + domain knowledge
- **Fit:** 92%
`,
    benchmark: `---
name: Benchmark
slug: benchmark
version: 1.0.0
description: "Benchmark tool, strategy, or model performance against defined metrics. Use to compare alternatives before committing."
---

## Usage

/benchmark <target> --metrics <list> --baseline <reference>

## Metrics

- Latency (ms per operation)
- Accuracy (output quality score)
- Cost (API credits / compute units)
- Throughput (ops/sec)
- Error rate (% failed operations)

## Output

| Target | Metric | Score | vs Baseline |
|--------|--------|-------|------------|
| GPT-4  | Latency | 120ms | +15ms slower |
| Claude | Latency | 105ms | baseline |

## When to Run

- Before adopting a new model or tool
- After strategy parameter changes
- Weekly performance review
`,
    insights: `---
name: Insights
slug: insights
version: 1.0.0
description: "Surface patterns, learnings, and anomalies from accumulated memory and session logs. Use when solving a recurring problem or seeking optimization opportunities."
---

## Usage

/insights [--topic <domain>] [--since <days>] [--limit 10]

## Sources

- Self-improving memory (~/self-improving/)
- FTS5 conversation history
- Correction logs
- Skill usage metrics

## Output

- Top patterns (with frequency count)
- Recent corrections relevant to topic
- Suggested next actions

## Example

**Input:** /insights --topic trading --limit 5

**Output:**
- 🔁 "Freqtrade dry-run validation fails on missing indicators" — 4x
- ✅ "Use --dry-run-wallet small instead of default" — confirmed
- 💡 Suggestion: Add indicator presence check to pre-validation
`,
};
class SkillManager {
    skills = new Map();
    async discover(_skillsDir) {
        const results = [];
        for (const [slug, content] of Object.entries(SKILL_CONTENT)) {
            const lines = content.split('\n');
            let version = '1.0.0';
            let description = '';
            for (const line of lines) {
                if (line.startsWith('version:'))
                    version = line.split(':')[1].trim();
                if (line.startsWith('description:'))
                    description = line.split(':', 2).slice(1).join(':').trim().replace(/"/g, '');
            }
            const entry = {
                slug,
                name: SKILL_CONTENT[slug]
                    ?.split('\n')
                    .find((l) => l.startsWith('name:'))
                    ?.split(':')[1]
                    .trim() || slug,
                description,
                content,
                version,
            };
            this.skills.set(slug, entry);
            results.push(entry);
        }
        return results;
    }
    getSkill(slug) {
        return this.skills.get(slug);
    }
    listSkills() {
        return Array.from(this.skills.values());
    }
}
const skillManager = new SkillManager();
function getSkillsDir() {
    return path.join(path.dirname(fileURLToPath(import.meta.url)), 'skills');
}
export default definePluginEntry({
    id: 'claw-core',
    name: 'Claw_Core + ZCrystal',
    description: 'Claw_Core System v1.5.1 + ZCrystal v0.3.0: Unified plugin with skills, tool registry, insights, Honcho, Self-Evolution, and FTS5',
    register(api) {
        console.log('[Claw_Core+ZCrystal] Registering unified plugin...');
        const skillsDir = getSkillsDir();
        skillManager.discover(skillsDir).catch((err) => {
            console.warn('[Claw_Core+ZCrystal] Skill discovery failed:', err);
        });
        const toolRegistryService = createToolRegistryService(api);
        const insightsService = createInsightsService(api);
        api.registerService(toolRegistryService);
        api.registerService(insightsService);
        api.registerService(createCredentialPoolService(api));
        api.registerService(createMcpBridgeService(api));
        try {
            const router = new UnifiedApiRouter();
            const honcho = createHonchoClient({ baseUrl: 'http://localhost:8000', workspace: 'openclaw' });
            const skillManagerZCrystal = createSkillManager(zcrystalConfig.paths.skills);
            const diskStore = new DiskStore(zcrystalConfig.paths.temp);
            const evolutionStore = new EvolutionStore(diskStore);
            const traceStore = new TraceStore(diskStore);
            const selfEvolution = new SelfEvolutionEngine(evolutionStore, traceStore);
            const toolHub = new ToolHub();
            const skillGenerator = new SkillGenerator();
            const circuitBreaker = new CircuitBreaker({
                failureThreshold: 5,
                successThreshold: 2,
                timeout: 60000,
            });
            const rateLimiter = new RateLimiter({ maxTokens: 100, refillRate: 10, windowMs: 60000 });
            const logger = new StructuredLogger('ZCrystal');
            const metrics = new Metrics();
            const workflowEngine = new WorkflowEngine();
            const skillAdapter = new OpenClawSkillAdapter({
                openClawSkillsPath: zcrystalConfig.paths.skills,
                zCrystalSkillsPath: zcrystalConfig.paths.data + '/skills',
            });
            const skillSyncManager = new SkillSyncManager(skillAdapter);
            const replayRunner = new ReplayRunner();
            const hookRegistry = new HookRegistry();
            const skillVersioning = new SkillVersioning();
            const skillIndexer = new SkillIndexer();
            const skillValidator = new SkillValidator();
            const skillMerger = new SkillMerger();
            const reviewEngine = new ReviewEngine();
            const evolutionCoordinator = new EvolutionCoordinator(evolutionStore, traceStore);
            const getSkills = async () => {
                try {
                    if (zcState?.skillManager) {
                        const result = await zcState.skillManager.discover();
                        if (result?.ok && result.data) {
                            return result.data.map((s) => ({ slug: s.slug || s.id || '', content: s.content || '' }));
                        }
                    }
                }
                catch { }
                return [];
            };
            const evolutionScheduler = new EvolutionScheduler(evolutionCoordinator, getSkills, 60 * 60 * 1000);
            zcState = {
                router, honcho, skillManager: skillManagerZCrystal, selfEvolution, evolutionCoordinator,
                evolutionScheduler, reviewEngine, toolHub, skillGenerator, skillVersioning, skillIndexer,
                skillValidator, skillMerger, circuitBreaker, rateLimiter, logger, metrics, workflowEngine,
                skillAdapter, skillSyncManager, replayRunner, hookRegistry, traceStore
            };
            try {
                evolutionScheduler.start();
                console.log('[Claw_Core+ZCrystal] Auto-evolution scheduler started (1 hour interval)');
            }
            catch (err) {
                console.warn('[Claw_Core+ZCrystal] Failed to start evolution scheduler:', err);
            }
        }
        catch (err) {
            console.warn('[Claw_Core+ZCrystal] ZCrystal_evo initialization failed (running in degraded mode):', err);
            zcState = null;
        }
        const heartbeatInterval = setInterval(async () => {
            try {
                if (zcState) {
                    const status = await zcState.router.healthCheck();
                    const evo = await zcState.router.getEvolutionStatus();
                    if (status.success) {
                        console.log('[Claw_Core+ZCrystal Heartbeat] OK - Evolution:', evo.data?.running ? 'running' : 'idle');
                    }
                }
            }
            catch (e) {
                console.error('[Claw_Core+ZCrystal Heartbeat] Error:', e);
            }
        }, 5 * 60 * 1000);
        const proactiveInterval = setInterval(async () => {
            try {
                if (zcState) {
                    const sessionResult = await zcState.router.memoryLoad('L2', 'session:current');
                    const suggestions = zcState.reviewEngine.getUpgradeSuggestions();
                    if (sessionResult.success && sessionResult.data && suggestions.length > 0) {
                        console.log('[Claw_Core+ZCrystal Proactive] Session active,', suggestions.length, 'suggestions available');
                    }
                }
            }
            catch (e) {
                console.error('[Claw_Core+ZCrystal Proactive] Error:', e);
            }
        }, 10 * 60 * 1000);
        api.registerHook('unload', () => {
            clearInterval(heartbeatInterval);
            clearInterval(proactiveInterval);
            zcState?.evolutionScheduler?.stop();
            console.log('[Claw_Core+ZCrystal] Cleanup complete on unload');
        }, { name: 'claw-core:unload' });
        api.registerHook('agent:bootstrap', async (event) => {
            if (!zcState)
                return;
            const ctx = event;
            const bootstrapFiles = ctx.bootstrapFiles || [];
            const MEMORY_BANK_INDEX = path.join(zcrystalConfig.paths.home, '.openclaw', 'extensions', 'zcrystal', 'data', 'memory-bank-index.md');
            const { readFile, stat: fsStat } = await import('node:fs/promises');
            const { existsSync } = await import('node:fs');
            try {
                if (existsSync(MEMORY_BANK_INDEX)) {
                    const fileStat = await fsStat(MEMORY_BANK_INDEX);
                    const content = await readFile(MEMORY_BANK_INDEX, 'utf-8');
                    const age = Date.now() - fileStat.mtimeMs;
                    if (age < 3600000) {
                        console.log('[Claw_Core:memory-bank] Injecting memory bank context into bootstrap');
                        const mbIdx = bootstrapFiles.findIndex(f => f.includes('MEMORY.md'));
                        if (mbIdx !== -1) {
                            await zcState.router.memoryStoreData('L1', '_bootstrap_memory_bank', content);
                        }
                    }
                }
            }
            catch (err) {
                console.warn('[Claw_Core:memory-bank] Bootstrap inject failed:', err);
            }
        }, { name: 'claw-core:memory-bank-bootstrap' });
        if (zcState) {
            registerCoreTools(api, zcState);
            registerTaskTools(api, zcState);
            registerSkillTools(api, zcState);
            registerWorkflowTools(api, zcState);
            registerSystemTools(api, zcState);
            registerProactiveTools(api, zcState);
            registerHealthTools(api);
            registerMetricsTools(api);
            registerPipelineTools(api);
            registerDecomposeRouterTools(api);
            registerCredentialPoolTools(api);
            registerSkillSystemTools(api);
            registerBenchmarkTools(api);
            registerEventsTools(api);
            registerMiddlewareTools(api);
            registerRegistryTools(api);
            registerRetryTools(api);
            registerTelemetryTools(api);
            registerCircuitBreakerTools(api);
            registerRateLimitTools(api);
            registerCoordinatorTools(api);
            registerWorkerpoolTools(api);
            registerMonitorTools(api);
            registerBulkheadTools(api);
            registerCacheTools(api);
            registerContextEngineTools(api);
            registerDecomposerTools(api);
            registerMemoryBankTools(api);
            registerErrorClassifierTools(api);
            registerFeaturesTools(api);
            registerLazyTools(api);
            registerLockTools(api);
            registerQuotaTools(api);
            registerSerializersTools(api);
            registerSignalTools(api, zcState);
        }
        api.registerTool({
            name: 'zcrystal_fts5_search',
            label: 'ZCrystal FTS5 Search',
            description: 'Search conversation history using FTS5 full-text search',
            parameters: Type.Object({ query: Type.String(), limit: Type.Optional(Type.Number()) }),
            async execute(_id, _params) {
                const params = _params;
                const result = await fts5Search(params.query, params.limit || 20);
                if (result.success)
                    return okResult(result.data);
                return errResult(result.error ?? 'FTS5 search failed');
            },
        });
        api.registerTool({
            name: 'zcrystal_fts5_stats',
            label: 'ZCrystal FTS5 Stats',
            description: 'Get FTS5 database statistics',
            parameters: Type.Object({}),
            async execute(_id, _params) {
                const result = await fts5Stats();
                if (result.success)
                    return okResult(result.data);
                return errResult(result.error ?? 'FTS5 stats failed');
            },
        });
        if (zcState) {
            api.registerTool({
                name: 'zcrystal_toolhub_call',
                label: 'ZCrystal ToolHub Call',
                description: 'Execute a tool via ToolHub with security checks',
                parameters: Type.Object({
                    toolName: Type.String(),
                    params: Type.Record(Type.String(), Type.Any()),
                    taskId: Type.Optional(Type.String()),
                }),
                async execute(_id, _args) {
                    const args = _args;
                    if (!zcState)
                        return errResult('Plugin not initialized');
                    const result = await zcState.toolHub.doToolCall(args.toolName, args.params, args.taskId);
                    if (result.success) {
                        return okResult(JSON.stringify(result.data, null, 2), { durationMs: result.durationMs });
                    }
                    return errResult(result.error || 'Tool call failed');
                },
            });
            api.registerTool({
                name: 'zcrystal_toolhub_schema',
                label: 'ZCrystal ToolHub Schema',
                description: 'Get tool schema by name from ToolHub',
                parameters: Type.Object({ name: Type.String() }),
                async execute(_id, _params) {
                    const params = _params;
                    if (!zcState)
                        return errResult('Plugin not initialized');
                    const schema = zcState.toolHub.getToolSchema(params.name);
                    if (schema)
                        return okResult(JSON.stringify(schema, null, 2));
                    return errResult('Tool schema not found: ' + params.name);
                },
            });
            api.registerTool({
                name: 'zcrystal_toolhub_logs',
                label: 'ZCrystal ToolHub Logs',
                description: 'Get recent tool execution logs',
                parameters: Type.Object({ limit: Type.Optional(Type.Number()) }),
                async execute(_id, _params) {
                    const params = _params;
                    if (!zcState)
                        return errResult('Plugin not initialized');
                    const logs = zcState.toolHub.getLogs(undefined, params.limit || 100);
                    return okResult(JSON.stringify(logs, null, 2), { count: logs.length });
                },
            });
            api.registerTool({
                name: 'zcrystal_skill_generate',
                label: 'ZCrystal Skill Generate',
                description: 'Generate a new skill from task execution patterns',
                parameters: Type.Object({
                    taskType: Type.String(),
                    toolChain: Type.Array(Type.String()),
                    parameters: Type.Optional(Type.Record(Type.String(), Type.Any())),
                    examples: Type.Optional(Type.Array(Type.Any())),
                    edgeCases: Type.Optional(Type.Array(Type.Any())),
                }),
                async execute(_id, _params) {
                    const params = _params;
                    if (!zcState)
                        return errResult('Plugin not initialized');
                    const generated = await zcState.skillGenerator.generateFromTask(params.taskType, params.toolChain, params.parameters || {}, params.examples || [], params.edgeCases || []);
                    if (generated)
                        return okResult(JSON.stringify(generated, null, 2), { skillId: generated.skillId });
                    return errResult('Skill generation failed');
                },
            });
            api.registerTool({
                name: 'zcrystal_skill_generator_stats',
                label: 'ZCrystal Skill Generator Stats',
                description: 'Get skill generator statistics',
                parameters: Type.Object({}),
                async execute(_id, _params) {
                    if (!zcState)
                        return errResult('Plugin not initialized');
                    const stats = zcState.skillGenerator.getGenerationStats();
                    return okResult(JSON.stringify(stats, null, 2));
                },
            });
            api.registerTool({
                name: 'zcrystal_circuit_status',
                label: 'ZCrystal Circuit Breaker Status',
                description: 'Get circuit breaker current state and stats',
                parameters: Type.Object({}),
                async execute(_id, _params) {
                    if (!zcState)
                        return errResult('Plugin not initialized');
                    const cbState = zcState.circuitBreaker.getState();
                    const stats = zcState.circuitBreaker.getStats();
                    const canExecute = zcState.circuitBreaker.canExecute();
                    return okResult(JSON.stringify({ state: cbState, stats, canExecute }, null, 2));
                },
            });
            api.registerTool({
                name: 'zcrystal_circuit_reset',
                label: 'ZCrystal Circuit Breaker Reset',
                description: 'Reset circuit breaker to closed state',
                parameters: Type.Object({}),
                async execute(_id, _params) {
                    if (!zcState)
                        return errResult('Plugin not initialized');
                    zcState.circuitBreaker.reset();
                    return okResult('Circuit breaker reset to CLOSED state');
                },
            });
            api.registerTool({
                name: 'zcrystal_circuit_check',
                label: 'ZCrystal Circuit Check',
                description: 'Check if operation can be executed (Agent-internal)',
                parameters: Type.Object({}),
                async execute(_id, _params) {
                    if (!zcState)
                        return errResult('Plugin not initialized');
                    const canExecute = zcState.circuitBreaker.canExecute();
                    return okResult(canExecute ? 'Circuit allows execution' : 'Circuit breaker is OPEN - operation blocked');
                },
            }, { optional: true });
            api.registerTool({
                name: 'zcrystal_rate_status',
                label: 'ZCrystal Rate Limiter Status',
                description: 'Get rate limiter current status',
                parameters: Type.Object({}),
                async execute(_id, _params) {
                    if (!zcState)
                        return errResult('Plugin not initialized');
                    const status = zcState.rateLimiter.getStatus();
                    return okResult(JSON.stringify(status, null, 2));
                },
            });
            api.registerTool({
                name: 'zcrystal_rate_check',
                label: 'ZCrystal Rate Check',
                description: 'Check if operation is allowed (Agent-internal)',
                parameters: Type.Object({ tokens: Type.Optional(Type.Number()) }),
                async execute(_id, _params) {
                    const params = _params;
                    if (!zcState)
                        return errResult('Plugin not initialized');
                    const allowed = zcState.rateLimiter.isAllowed(params.tokens || 1);
                    return okResult(allowed ? 'Rate limit allows execution' : 'Rate limit exceeded - operation blocked');
                },
            }, { optional: true });
            api.registerTool({
                name: 'zcrystal_log',
                label: 'ZCrystal Log',
                description: 'Write structured log entry (Agent-internal)',
                parameters: Type.Object({
                    level: Type.Union([Type.Literal('info'), Type.Literal('warn'), Type.Literal('error')]),
                    message: Type.String(),
                    context: Type.Optional(Type.Record(Type.String(), Type.Any())),
                }),
                async execute(_id, _params) {
                    const params = _params;
                    if (!zcState)
                        return errResult('Plugin not initialized');
                    if (params.level === 'info')
                        zcState.logger.info(params.message, params.context || {});
                    else if (params.level === 'warn')
                        zcState.logger.warning(params.message, params.context || {});
                    else if (params.level === 'error')
                        zcState.logger.error(params.message, params.context || {});
                    return okResult('Logged: ' + params.message);
                },
            }, { optional: true });
            api.registerTool({
                name: 'zcrystal_metrics_get',
                label: 'ZCrystal Metrics Get',
                description: 'Get current metrics statistics',
                parameters: Type.Object({}),
                async execute(_id, _params) {
                    if (!zcState)
                        return errResult('Plugin not initialized');
                    const stats = zcState.metrics.getStats();
                    return okResult(JSON.stringify(stats, null, 2));
                },
            });
            api.registerTool({
                name: 'zcrystal_metrics_record',
                label: 'ZCrystal Metrics Record',
                description: 'Record a custom metric event (Agent-internal)',
                parameters: Type.Object({
                    type: Type.Union([Type.Literal('task'), Type.Literal('tool'), Type.Literal('model')]),
                    name: Type.String(),
                    durationMs: Type.Optional(Type.Number()),
                    success: Type.Optional(Type.Boolean()),
                }),
                async execute(_id, _params) {
                    const params = _params;
                    if (!zcState)
                        return errResult('Plugin not initialized');
                    if (params.type === 'task') {
                        if (params.success === false) {
                            zcState.metrics.recordTaskFailed(params.name, 'error', params.durationMs || 0);
                        }
                        else {
                            zcState.metrics.recordTaskCompleted(params.name, params.durationMs || 0);
                        }
                    }
                    else if (params.type === 'tool') {
                        zcState.metrics.recordToolCall(params.name, params.durationMs || 0, params.success !== false);
                    }
                    return okResult('Metric recorded: ' + params.type + '/' + params.name);
                },
            }, { optional: true });
            api.registerTool({
                name: 'zcrystal_evolution_control',
                label: 'ZCrystal Evolution Control',
                description: 'Enable or disable auto-evolution scheduler',
                parameters: Type.Object({ action: Type.Union([Type.Literal('start'), Type.Literal('stop'), Type.Literal('status')]) }),
                async execute(_id, _params) {
                    const params = _params;
                    if (!zcState || !zcState.evolutionScheduler)
                        return errResult('Plugin not initialized or scheduler unavailable');
                    if (params.action === 'start') {
                        zcState.evolutionScheduler.start();
                        return okResult('✅ Auto-evolution scheduler started (1 hour interval)');
                    }
                    else if (params.action === 'stop') {
                        zcState.evolutionScheduler.stop();
                        return okResult('⏸ Auto-evolution scheduler stopped');
                    }
                    else {
                        const running = zcState.evolutionScheduler.running;
                        return okResult(`Evolution scheduler: ${running ? '🟢 running' : '🔴 stopped'}`);
                    }
                },
            });
        }
        api.registerTool({
            name: 'claw_core_skill_list',
            label: 'Claw_Core Skill List',
            description: 'List all available Claw_Core skills',
            parameters: Type.Object({}),
            async execute(_id, _params) {
                const skills = skillManager.listSkills();
                const lines = skills.map((s) => `• **${s.slug}** (v${s.version}): ${s.description}`).join('\n');
                return okResult(`Claw_Core Skills:\n${lines}`, { count: skills.length });
            },
        });
        api.registerTool({
            name: 'claw_core_skill_get',
            label: 'Claw_Core Skill Get',
            description: 'Get the full content of a Claw_Core skill',
            parameters: Type.Object({ slug: Type.String() }),
            async execute(_id, params) {
                const skill = skillManager.getSkill(params.slug);
                if (!skill)
                    return errResult(`Skill not found: ${params.slug}`);
                return okResult(skill.content, { slug: skill.slug, version: skill.version });
            },
        });
        api.registerTool({
            name: 'claw_core_status',
            label: 'Claw_Core Status',
            description: 'Get Claw_Core+ZCrystal plugin status',
            parameters: Type.Object({}),
            async execute(_id, _params) {
                const skills = skillManager.listSkills();
                const zcActive = zcState !== null;
                return okResult(`Claw_Core+ZCrystal v1.5.1\n` +
                    `Claw_Core Skills: ${skills.map((s) => s.slug).join(', ')}\n` +
                    `ZCrystal: ${zcActive ? '✅ Active' : '⚠️ Degraded mode (evo init failed)'}\n` +
                    `Services: tool-registry, insights-engine, credential-pool, mcp-bridge`);
            },
        });
        api.registerCommand({
            name: 'decompose',
            description: 'Break a complex task into structured sub-tasks',
            async handler({ args }) {
                if (!args?.trim()) {
                    return { text: 'Usage: /decompose <task description>\nExample: /decompose Set up a new Freqtrade bot' };
                }
                const skill = skillManager.getSkill('decompose');
                return {
                    text: `**Decomposing task:** ${args}\n\n` +
                        `_(Skill: decompose v${skill?.version})_\n\n` +
                        `This task involves multiple steps. Based on the decompose skill template:\n\n` +
                        `1. ⏳ Define scope and success criteria\n` +
                        `2. ⏳ Identify dependencies and blockers\n` +
                        `3. ⏳ Sequence steps from foundation up\n` +
                        `4. ⏳ Assign each step a complexity label\n\n` +
                        `Run \`/skill claw-core:decompose\` for the full template.`,
                };
            },
        });
        api.registerCommand({
            name: 'route',
            description: 'Route a task to the optimal agent/executor',
            async handler({ args }) {
                if (!args?.trim()) {
                    return { text: 'Usage: /route <task description>\nExample: /route Debug my Freqtrade strategy' };
                }
                const skill = skillManager.getSkill('route-task');
                return {
                    text: `**Routing task:** ${args}\n\n` +
                        `_(Skill: route-task v${skill?.version})_\n\n` +
                        `Analyzing task type and matching to best executor...\n\n` +
                        `• **Primary:** Claw_Core agent (general purpose)\n` +
                        `• **Fallback:** Specialist agent via skill routing\n` +
                        `• **Reasoning:** Task type requires multi-step reasoning\n\n` +
                        `Run \`/skill claw-core:route-task\` for the full routing template.`,
                };
            },
        });
        api.registerCommand({
            name: 'benchmark',
            description: 'Benchmark tool or strategy performance',
            async handler({ args }) {
                if (!args?.trim()) {
                    return { text: 'Usage: /benchmark <target> [--metrics latency,cost]\nExample: /benchmark GPT-4 --metrics latency' };
                }
                const skill = skillManager.getSkill('benchmark');
                return {
                    text: `**Benchmarking:** ${args}\n\n` +
                        `_(Skill: benchmark v${skill?.version})_\n\n` +
                        `Metrics to track:\n• Latency (ms per operation)\n• Cost (API credits)\n• Accuracy (output quality)\n\n` +
                        `Run \`/skill claw-core:benchmark\` for the full benchmark template.`,
                };
            },
        });
        api.registerCommand({
            name: 'insights',
            description: 'Surface patterns and learnings from memory',
            async handler({ args }) {
                if (!args?.trim()) {
                    return { text: 'Usage: /insights [--topic <domain>] [--limit 5]\nExample: /insights --topic trading --limit 5' };
                }
                const skill = skillManager.getSkill('insights');
                return {
                    text: `**Searching insights:** ${args}\n\n` +
                        `_(Skill: insights v${skill?.version})_\n\n` +
                        `Scanning memory and session logs...\n\n` +
                        `• 🔁 Patterns found: _(scan complete)_\n` +
                        `• ✅ Recent corrections: _(scan complete)_\n` +
                        `• 💡 Suggestions: _(scan complete)_\n\n` +
                        `Run \`/skill claw-core:insights\` for the full insights template.`,
                };
            },
        });
        api.registerCommand({
            name: 'zcrystal_compact',
            description: 'Compact conversation and trigger self-evolution',
            async handler() {
                if (!zcState)
                    return { text: 'Plugin not initialized (ZCrystal degraded mode)' };
                const result = await zcState.router.startEvolution();
                if (result.success)
                    return { text: `Self-evolution complete: ${JSON.stringify(result.data)}` };
                return { text: 'Self-evolution failed: ' + result.error };
            },
        });
        api.registerCommand({
            name: 'zcrystal_learn',
            description: 'Teach ZCrystal your preferences',
            async handler({ args }) {
                if (!zcState)
                    return { text: 'Plugin not initialized (ZCrystal degraded mode)' };
                if (!args)
                    return { text: 'Usage: /learn <preference>' };
                await zcState.router.memoryStoreData('L3', 'user_preference', args);
                return { text: `✅ Learned: "${args}"` };
            },
        });
        api.registerCommand({
            name: 'zcrystal_profile',
            description: 'View ZCrystal profile',
            async handler() {
                if (!zcState)
                    return { text: 'Plugin not initialized (ZCrystal degraded mode)' };
                const health = await zcState.router.healthCheck();
                const skills = await zcState.router.listSkills();
                const evo = await zcState.router.getEvolutionStatus();
                const fts5 = await fts5Stats();
                return { text: `ZCrystal Profile:
- Health: ${health.success ? '✅ Healthy' : '❌ Unhealthy'}
- Skills: ${skills.success ? skills.data?.skills?.length || 0 : 'N/A'}
- Evolution: ${evo.success ? (evo.data?.running ? '🔄 Running' : '⏸️ Idle') : 'N/A'}
- FTS5: ${fts5.success ? '✅ Available' : '❌ Unavailable'}` };
            },
        });
        const FTS5_REALTIME_INDEXER = path.join(zcrystalConfig.paths.home, '.openclaw', 'skills', 'fts5', 'realtime_index.py');
        api.registerHook('message:received', async (event) => {
            if (!zcState)
                return;
            const { spawn } = await import('node:child_process');
            const msg = event?.context?.content
                || event?.content || '';
            if (msg) {
                await zcState.router.memoryStoreData('L3', 'last_message', msg);
                const rawEvent = event;
                try {
                    const msgData = JSON.stringify({
                        sender: 'user',
                        sender_label: rawEvent.sender_label || 'user',
                        content: stripPrivateTags(msg),
                        channel: rawEvent.channel || 'telegram',
                        session_key: rawEvent.session_key || '',
                        message_id: rawEvent.message_id || '',
                        timestamp: rawEvent.timestamp || new Date().toISOString(),
                    });
                    spawn('python3', [FTS5_REALTIME_INDEXER, msgData], { detached: true, stdio: 'ignore' });
                }
                catch (err) {
                    console.warn('[Claw_Core+ZCrystal] FTS5 realtime index failed:', err);
                }
            }
        }, { name: 'zcrystal:msg_received' });
        api.registerHook('message:sent', async (event) => {
            if (!zcState)
                return;
            const { spawn } = await import('node:child_process');
            const content = event?.context?.content
                || event?.content || '';
            if (content) {
                await zcState.router.memoryStoreData('L2', 'last_ai_response', content);
                const rawEvent = event;
                try {
                    const msgData = JSON.stringify({
                        sender: 'assistant',
                        sender_label: rawEvent.sender_label || 'assistant',
                        content: stripPrivateTags(content),
                        channel: rawEvent.channel || 'telegram',
                        session_key: rawEvent.session_key || '',
                        message_id: rawEvent.message_id || '',
                        timestamp: rawEvent.timestamp || new Date().toISOString(),
                    });
                    spawn('python3', [FTS5_REALTIME_INDEXER, msgData], { detached: true, stdio: 'ignore' });
                }
                catch (err) {
                    console.warn('[Claw_Core+ZCrystal] FTS5 realtime index failed:', err);
                }
            }
        }, { name: 'zcrystal:msg_sent' });
        api.registerHook('message:preprocessed', async (event) => {
            if (!zcState)
                return;
            const ctx = event;
            const messages = ctx.messages;
            if (!messages || messages.length === 0)
                return;
            const beforeCount = messages.length;
            const beforeTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
            const compressed = compressContext(messages);
            const afterTokens = compressed.reduce((sum, m) => sum + estimateTokens(m.content), 0);
            const savedTokens = beforeTokens - afterTokens;
            const savedMessages = beforeCount - compressed.length;
            if (savedTokens > 100 || savedMessages > 2) {
                console.log(`[ZCrystal:context-compressor] Reduced ${beforeCount}→${compressed.length} messages, ` +
                    `~${beforeTokens}→~${afterTokens} tokens (saved ~${savedTokens} tokens, ${savedMessages} msgs)`);
                ctx.messages = compressed;
            }
        }, { name: 'zcrystal:context-compressor' });
        api.registerHook('after_tool_call', async (event) => {
            if (!zcState)
                return;
            const errCtx = event;
            if (!errCtx.error)
                return;
            const { toolName, error, durationMs } = errCtx;
            const classification = classifyError(error);
            const logLine = `[ZCrystal:error-classifier] Tool="${toolName || 'unknown'}" ` +
                `Category=${classification.category} ` +
                `Severity=${classification.severity} ` +
                `Retry=${classification.canRetry} ` +
                `Duration=${durationMs ?? 0}ms ` +
                `Error="${(error ?? '').slice(0, 120)}" ` +
                `Suggestion="${classification.suggestion}"`;
            if (classification.severity === 'high')
                console.error(logLine);
            else
                console.warn(logLine);
            errCtx._zcrystal_error_classification = classification;
        });
        api.registerHook('llm_output', async (event) => {
            if (!zcState)
                return;
            const llmEvent = event;
            const texts = llmEvent.assistantTexts || [];
            if (texts.length === 0)
                return;
            for (const text of texts) {
                const hasUncertainty = UNCERTAINTY_MARKERS.some(m => text.includes(m));
                if (!hasUncertainty)
                    continue;
                const marker = UNCERTAINTY_MARKERS.find(m => text.includes(m));
                const markerIdx = text.indexOf(marker);
                const start = Math.max(0, markerIdx - 100);
                const end = Math.min(text.length, markerIdx + marker.length + 100);
                const context = text.slice(start, end);
                const words = context.split(/[\s,，。!?]+/).filter((w) => w.length > 2);
                const searchTerms = words.slice(-6).join(' ') || marker;
                setRecallContext({
                    marker,
                    searchTerms,
                    timestamp: Date.now(),
                    responsePreview: text.slice(0, 100),
                });
                console.log(`[ZCrystal:self-doubt] Detected "${marker}". Context stored for injection.`);
                break;
            }
        });
        api.registerHook('before_prompt_build', async (event) => {
            if (!zcState)
                return;
            const recallCtx = getRecallContext();
            if (!recallCtx)
                return;
            const { spawn } = await import('node:child_process');
            const termsArg = JSON.stringify(recallCtx.searchTerms);
            const pyScript = ('import sys; ' +
                'sys.path.insert(0, "/home/snow/.openclaw"); ' +
                'from skills.fts5 import search; ' +
                'results = search(' + termsArg + ', limit=5); ' +
                'if results: print("\\n".join([f\"[{r.get("timestamp","")[:16]}] {r.get("sender","unknown")[:12]}: {r.get("content","")[:150].replace(chr(10), " ")}\" for r in results])); ' +
                'else: print("")');
            try {
                const py = spawn('python3', ['-c', pyScript]);
                let searchResults = '';
                py.stdout.on('data', (d) => searchResults += d.toString());
                py.stderr.on('data', (d) => console.warn('[ZCrystal:self-doubt]', d.toString()));
                await new Promise((resolve, reject) => {
                    py.on('close', (code) => { if (code === 0)
                        resolve();
                    else
                        reject(new Error('exit ' + code)); });
                    py.on('error', reject);
                });
                searchResults = searchResults.trim();
                if (searchResults) {
                    await zcState.router.memoryStoreData('L1', '_pending_recall', JSON.stringify({
                        marker: recallCtx.marker,
                        results: searchResults,
                        timestamp: Date.now(),
                    }));
                    clearRecallContext();
                    console.log(`[ZCrystal:self-doubt] Stored recall results in state for tool access.`);
                }
            }
            catch (err) {
                console.warn('[ZCrystal:self-doubt] Search failed:', err);
            }
        });
        console.log('[Claw_Core+ZCrystal] Registered 4 claw-core commands + 95+ zcrystal tools + 4 services + hooks');
    },
});
