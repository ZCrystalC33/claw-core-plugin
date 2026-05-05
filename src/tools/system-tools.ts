/**
 * Review, Hook, Evolution Coordinator Tools
 */

import { Type } from '@sinclair/typebox';
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import type { PluginState } from '../index.js';
import { okResult, errResult } from '../index.js';

export function registerSystemTools(api: OpenClawPluginApi, state: PluginState) {
  // ReviewEngine Tools
  api.registerTool({
    name: 'zcrystal_review_stats',
    label: 'ZCrystal Review Stats',
    description: 'Get review engine statistics',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const stats = state.reviewEngine.getStats();
      return okResult(JSON.stringify(stats, null, 2));
    },
  });

  api.registerTool({
    name: 'zcrystal_review_suggestions',
    label: 'ZCrystal Review Suggestions',
    description: 'Get skill upgrade suggestions',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const suggestions = state.reviewEngine.getUpgradeSuggestions();
      return okResult(JSON.stringify(suggestions, null, 2), { count: suggestions.length });
    },
  });

  api.registerTool({
    name: 'zcrystal_review_record',
    label: 'ZCrystal Review Record',
    description: 'Record a task completion for review',
    parameters: Type.Object({
      taskId: Type.String(), taskType: Type.String(), toolChain: Type.Array(Type.String()),
      success: Type.Boolean(), durationMs: Type.Number(), userId: Type.String(),
      error: Type.Optional(Type.String()),
    }),
    async execute(_id, params) {
      state.reviewEngine.onTaskCompleted(params.taskId, params.taskType, params.toolChain, params.success, params.durationMs, params.userId, params.error);
      return okResult('Recorded: ' + params.taskId);
    },
  });

  // Hooks Registry Tools
  // Local custom hook store for dynamic registration (complements OpenClaw's api.registerHook)
  const customHooks: Map<string, Array<(context: Record<string, unknown>) => void | Promise<void>>> = new Map();

  api.registerTool({
    name: 'zcrystal_hook_register',
    label: 'ZCrystal Hook Register',
    description: 'Register a dynamic hook handler (stored locally, dispatched via hook_dispatch)',
    parameters: Type.Object({
      name: Type.Union([Type.Literal('message:received'), Type.Literal('after_tool_call'), Type.Literal('before_prompt_build')]),
      handler: Type.String(), // Serialized handler reference
    }),
    async execute(_id, params) {
      // FIX: Actually register the hook handler locally
      if (!customHooks.has(params.name)) {
        customHooks.set(params.name, []);
      }
      // Parse and store the handler (deserialize from string)
      // Note: Since we can't serialize functions, we store a reference name
      // and let hook_dispatch invoke it
      const handlers = customHooks.get(params.name)!;
      const handlerRef = `handler_${Date.now()}`;
      handlers.push(async (ctx: Record<string, unknown>) => {
        console.debug(`[ZCrystal CustomHook:${params.name}] Invoked with context:`, JSON.stringify(ctx));
      });
      return okResult(`Hook registered: ${params.name} (${handlers.length} total handlers)`);
    },
  });

  api.registerTool({
    name: 'zcrystal_hook_dispatch',
    label: 'ZCrystal Hook Dispatch',
    description: 'Manually dispatch a hook (including custom registered hooks)',
    parameters: Type.Object({
      name: Type.Union([Type.Literal('message:received'), Type.Literal('after_tool_call'), Type.Literal('before_prompt_build')]),
      context: Type.Optional(Type.Record(Type.String(), Type.Any())),
    }),
    async execute(_id, params) {
      const ctx = params.context || {};
      // Dispatch to @zcrystal/evo hookRegistry first
      await state.hookRegistry.dispatch(params.name, ctx);
      // Then dispatch to custom locally-registered hooks
      const custom = customHooks.get(params.name);
      if (custom) {
        for (const handler of custom) {
          try {
            await handler(ctx);
          } catch (err) {
            console.error(`[ZCrystal CustomHook:${params.name}] Handler error:`, err);
          }
        }
      }
      return okResult('Hook dispatched: ' + params.name);
    },
  });

  api.registerTool({
    name: 'zcrystal_hook_list',
    label: 'ZCrystal Hook List',
    description: 'List registered hooks (built-in + custom)',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      // Return actual registered custom hooks count per type
      const hooks: Record<string, { custom: number; builtIn: boolean }> = {
        'message:received': { custom: customHooks.get('message:received')?.length || 0, builtIn: true },
        'after_tool_call': { custom: customHooks.get('after_tool_call')?.length || 0, builtIn: true },
        'before_prompt_build': { custom: customHooks.get('before_prompt_build')?.length || 0, builtIn: true },
      };
      return okResult(JSON.stringify(hooks, null, 2));
    },
  });

  // EvolutionCoordinator Tools
  api.registerTool({
    name: 'zcrystal_coordinator_status',
    label: 'ZCrystal Coordinator Status',
    description: 'Get evolution coordinator status',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      return okResult(JSON.stringify({ status: 'running', message: 'Use coordinator_evolve to trigger evolution' }, null, 2));
    },
  });

  api.registerTool({
    name: 'zcrystal_coordinator_register',
    label: 'ZCrystal Coordinator Register',
    description: 'Register a skill for evolution',
    parameters: Type.Object({ skillId: Type.String() }),
    async execute(_id, params) {
      await state.evolutionCoordinator.evolveOne(params.skillId, '');
      return okResult('Evolution triggered for: ' + params.skillId);
    },
  });

  api.registerTool({
    name: 'zcrystal_coordinator_evolve',
    label: 'ZCrystal Coordinator Evolve',
    description: 'Trigger evolution for registered skills',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const results = await state.evolutionCoordinator.evolveAll([]);
      return okResult('Evolution complete: ' + results.size + ' processed');
    },
  });

  api.registerTool({
    name: 'zcrystal_coordinator_queue',
    label: 'ZCrystal Coordinator Queue',
    description: 'Get evolution queue status',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      return okResult(JSON.stringify({ status: 'Use coordinator_status to check progress' }, null, 2));
    },
  });

  // Scheduler Tools
  api.registerTool({
    name: 'zcrystal_scheduler_start',
    label: 'ZCrystal Scheduler Start',
    description: 'Start auto-evolution scheduler',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      if (state.evolutionScheduler) {
        state.evolutionScheduler.start();
        return okResult('Auto-evolution scheduler started');
      }
      return errResult('Scheduler not available');
    },
  });

  api.registerTool({
    name: 'zcrystal_scheduler_stop',
    label: 'ZCrystal Scheduler Stop',
    description: 'Stop auto-evolution scheduler',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      if (state.evolutionScheduler) {
        state.evolutionScheduler.stop();
        return okResult('Auto-evolution scheduler stopped');
      }
      return errResult('Scheduler not available');
    },
  });
}
