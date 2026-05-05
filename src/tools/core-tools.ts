/**
 * Core Tools - Original ZCrystal features
 */

import { Type } from '@sinclair/typebox';
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import type { PluginState } from '../index.js';
import { okResult, errResult } from '../index.js';
import type { Skill } from '@zcrystal/evo';
import type { SearchResult } from '../types.js';

// Local type definition for ExecutionTrace
// Note: TraceStore.saveTrace() expects string id (not TypedId object)
interface ExecutionTrace {
  id: string;  // Format: "skillSlug:trace:timestamp" (store key)
  skillSlug: string;
  timestamp: number;
  success: boolean;
  durationMs: number;
  details?: string;
  input?: string;
  output?: string;
}

// ============================================================
// Type Helpers (FIX: Replace messy inline casting with helpers)
// ============================================================

interface Result<T> { ok: true; data: T }

function isResult<T>(val: T | { ok: true; data: T } | unknown): val is { ok: true; data: T } {
  return typeof val === 'object' && val !== null && 'ok' in val && (val as { ok: boolean }).ok === true;
}

function unwrapSkills(val: unknown): Skill[] {
  if (Array.isArray(val)) return val as Skill[];
  if (isResult(val)) return (val as Result<Skill[]>).data;
  return [];
}

function unwrapSkill(val: unknown): Skill | undefined {
  if (Array.isArray(val)) return val[0] as Skill;
  if (isResult(val)) return (val as Result<Skill>).data;
  return val as Skill | undefined;
}

function unwrapString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (isResult(val)) return (val as Result<string>).data || '';
  return '';
}

export function registerCoreTools(api: OpenClawPluginApi, state: PluginState) {
  // zcrystal_evo_health
  api.registerTool({
    name: 'zcrystal_evo_health',
    label: 'ZCrystal Evo Health',
    description: 'Health check for ZCrystal_evo core',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const result = await state.router.healthCheck();
      if (result.success) return okResult('ZCrystal_evo is healthy', result.data);
      return errResult(result.error ?? 'Health check failed');
    },
  });

  // zcrystal_search
  api.registerTool({
    name: 'zcrystal_search',
    label: 'ZCrystal Search',
    description: 'Search conversation history (FTS5)',
    parameters: Type.Object({ query: Type.String(), limit: Type.Optional(Type.Number()) }),
    async execute(_id, params) {
      const limit = params.limit || 10;
      // FIX: Direct FTS5 search via Python subprocess (bypasses MCP HTTP dependency)
      try {
        const { spawn } = await import('node:child_process');
        const result = await new Promise<string>((resolve, reject) => {
          const py = spawn('python3', [
            '-c',
            `import sys; sys.path.insert(0, '/home/snow/.openclaw'); from skills.fts5 import search; results = search(${JSON.stringify(params.query)}, limit=${limit}); print([[r['content'], r['sender'], r['timestamp']] for r in results], sep='\n')`
          ]);
          let stdout = '';
          let stderr = '';
          py.stdout.on('data', (d) => stdout += d.toString());
          py.stderr.on('data', (d) => stderr += d.toString());
          py.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr || `exit ${code}`)));
          py.on('error', reject);
        });
        if (result.trim()) {
          return okResult(`FTS5 Search Results:\n${result}`, { query: params.query });
        }
        return errResult('No results found');
      } catch (err) {
        // Fallback to Honcho if FTS5 fails
        const honchoResult = await state.honcho.search(params.query, limit);
        if (honchoResult.ok && Array.isArray(honchoResult.data) && honchoResult.data.length > 0) {
          return okResult(JSON.stringify(honchoResult.data, null, 2), { count: honchoResult.data.length });
        }
        return errResult('Search failed: ' + String(err));
      }
    },
  });

  // zcrystal_ask_user
  api.registerTool({
    name: 'zcrystal_ask_user',
    label: 'ZCrystal Ask User',
    description: 'Ask Honcho about user preferences',
    parameters: Type.Object({ question: Type.String(), depth: Type.Optional(Type.String()) }),
    async execute(_id, params) {
      const result = await state.honcho.ask('user', params.question, params.depth || 'quick');
      if (result.ok && result.data) return okResult(result.data, { question: params.question });
      return errResult('Ask failed');
    },
  });

  // zcrystal_skills
  api.registerTool({
    name: 'zcrystal_skills',
    label: 'ZCrystal Skills',
    description: 'List all available skills',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      // FIX: Use helper type guards instead of inline casting
      const result = await state.skillManager.getSkills();
      const skills = unwrapSkills(result);
      const text = skills.length === 0
        ? 'No skills discovered'
        : skills.map((s: Skill) => `- ${s.name} (${s.slug}): ${s.description}`).join('\n');
      return okResult(text, { count: skills.length });
    },
  });

  // zcrystal_skill_read
  api.registerTool({
    name: 'zcrystal_skill_read',
    label: 'ZCrystal Skill Read',
    description: 'Read content of a skill',
    parameters: Type.Object({ slug: Type.String() }),
    async execute(_id, params) {
      // FIX: Use helper type guards instead of inline casting
      const skillResult = await state.skillManager.getSkill(params.slug);
      const skill = unwrapSkill(skillResult);
      if (!skill) return errResult('Skill not found: ' + params.slug);
      const contentResult = await state.skillManager.readContent(skill);
      const content = unwrapString(contentResult);
      if (!content) return errResult('Failed to read skill content');
      return okResult(content, { slug: params.slug });
    },
  });

  // zcrystal_evolution_status
  api.registerTool({
    name: 'zcrystal_evolution_status',
    label: 'ZCrystal Evolution Status',
    description: 'Get evolution history and status',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const result = await state.router.getEvolutionStatus();
      if (result.success) return okResult(JSON.stringify(result.data, null, 2), result.data);
      return errResult('Evolution status unavailable');
    },
  });

  // zcrystal_evolve
  api.registerTool({
    name: 'zcrystal_evolve',
    label: 'ZCrystal Evolve',
    description: 'Trigger self-evolution for a skill or all skills',
    parameters: Type.Object({ slug: Type.Optional(Type.String()), iterations: Type.Optional(Type.Number()) }),
    async execute(_id, params) {
      const result = await state.router.startEvolution(params.slug);
      if (result.success) return okResult('Evolution started', result.data);
      return errResult(result.error ?? 'Evolution failed');
    },
  }, { optional: true });

  // zcrystal_record_trace
  api.registerTool({
    name: 'zcrystal_record_trace',
    label: 'ZCrystal Record Trace',
    description: 'Record execution trace for self-evolution',
    parameters: Type.Object({
      skillSlug: Type.String(), input: Type.String(), output: Type.String(),
      success: Type.Boolean(), duration: Type.Number(),
    }),
    async execute(_id, params) {
      try {
        if (!state?.traceStore) {
          state?.logger?.warning('[ZCrystal] traceStore not available');
          return errResult('Plugin not initialized');
        }

        const trace = {
          id: `${params.skillSlug}:trace:${Date.now()}`,
          skillSlug: params.skillSlug,
          input: params.input,
          output: params.output,
          success: params.success,
          timestamp: Date.now(),
          durationMs: params.duration || 0,
        };


        // Cast to any to bypass strict typing mismatch (store expects TypedId, we pass string id)
        await (state.traceStore as any).saveTrace(trace);
        state.logger?.info('[ZCrystal] Trace saved', { skillSlug: params.skillSlug, success: params.success });
        return okResult('Trace recorded', { skillSlug: params.skillSlug, traceId: trace.id });
      } catch (err) {
        state.logger?.error('[ZCrystal] Failed to save trace:', { error: String(err) });
        return errResult('Failed to save trace: ' + String(err));
      }
    },
  }, { optional: true });

  // ============================================================
  // Progressive Disclosure Tools (Claude-Mem inspired)
  // ============================================================

  // Layer 1: Memory index with token cost visibility
  api.registerTool({
    name: 'zcrystal_memory_index',
    label: 'ZCrystal Memory Index',
    description: 'Get lightweight index of memory entries (metadata only, ~50 tokens per entry). Use this first to find relevant entries before fetching full content.',
    parameters: Type.Object({
      query: Type.String(),
      limit: Type.Optional(Type.Number()),
    }),
    async execute(_id, params) {
      const limit = params.limit || 20;
      try {
        const { getMemoryIndex, formatMemoryIndexTable } = await import('../memory/progressive.js');
        const entries = await getMemoryIndex(params.query, limit);
        const table = formatMemoryIndexTable(entries);
        return okResult(table, { count: entries.length, totalTokens: entries.reduce((s, e) => s + e.tokenEstimate, 0) });
      } catch (err) {
        return errResult('Memory index failed: ' + String(err));
      }
    },
  }, { optional: true });

  // Layer 3: Fetch full observation by ID
  api.registerTool({
    name: 'zcrystal_memory_get',
    label: 'ZCrystal Memory Get',
    description: 'Get full memory entry content by ID. Use after memory_index to fetch details.',
    parameters: Type.Object({
      id: Type.Number(),
    }),
    async execute(_id, params) {
      try {
        const { getMemoryEntryById } = await import('../memory/progressive.js');
        const content = await getMemoryEntryById(params.id);
        if (content === null) return errResult(`Memory entry #${params.id} not found`);
        return okResult(content, { id: params.id, tokens: Math.ceil(content.length / 4) });
      } catch (err) {
        return errResult('Memory get failed: ' + String(err));
      }
    },
  }, { optional: true });

  // Self-Doubt Recall - Agent self-triggered memory recovery
  // Use when Agent suspects memory gaps: "我不記得", "不確定", "需要確認"
  // Also checks for pending recall from auto-detection (before_prompt_build hook)
  api.registerTool({
    name: 'zcrystal_recall',
    label: 'ZCrystal Recall',
    description: 'Recall relevant context from conversation history. Use when you suspect memory gaps or need to verify previous context. Call this BEFORE saying "I don\'t remember". If uncertainty was auto-detected, results may be waiting in state.',
    parameters: Type.Object({
      query: Type.String(),
      limit: Type.Optional(Type.Number()),
    }),
    async execute(_id, params) {
      const limit = params.limit || 5;
      try {
        // First check if there's pending recall from auto-detection
        let recallSource = 'manual';
        let results = '';
        
        if (state) {
          const pendingRecall = await state.router.memoryLoad('L1', '_pending_recall');
          if (pendingRecall.success && pendingRecall.data) {
            try {
              const parsed = JSON.parse(pendingRecall.data as string);
              if (Date.now() - parsed.timestamp < 60_000) {
                results = parsed.results as string;
                recallSource = 'auto-detected';
                console.log(`[ZCrystal:recall] Using auto-detected recall (${parsed.marker})`);
              }
            } catch {
              // Fall through to manual search
            }
          }
        }
        
        // If no pending recall, do manual search
        if (!results) {
          const { quickRecall } = await import('../memory/recall.js');
          results = await quickRecall(params.query, limit);
        }
        
        if (results) {
          return okResult(`[Recall (${recallSource})] Found relevant context:\n${results}\n\n💡 If this helps, incorporate into your response.`, { query: params.query, source: recallSource });
        }
        return okResult('[Recall] No relevant context found. You may proceed with your best knowledge.', { query: params.query });
      } catch (err) {
        return errResult('Recall failed: ' + String(err));
      }
    },
  }, { optional: true });
}
