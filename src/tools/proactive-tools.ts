/**
 * Proactive, Self-Improving, Webhook Tools
 */

import { Type } from '@sinclair/typebox';
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import type { PluginState } from '../index.js';
import { okResult, errResult } from '../index.js';

export function registerProactiveTools(api: OpenClawPluginApi, state: PluginState) {
  // Self-Improving Tools
  api.registerTool({
    name: 'zcrystal_correction_add',
    label: 'ZCrystal Correction Add',
    description: 'Add a correction to the learning log (L3)',
    parameters: Type.Object({ context: Type.String(), reflection: Type.String() }),
    async execute(_id, params) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await state.router.memoryStoreData('L3', `correction:${timestamp}`, `${params.context} | ${params.reflection}`);
      return okResult('Correction stored in L3');
    },
  });

  api.registerTool({
    name: 'zcrystal_correction_list',
    label: 'ZCrystal Correction List',
    description: 'List recent corrections from L3 memory',
    parameters: Type.Object({ limit: Type.Optional(Type.Number()) }),
    async execute(_id, _params) {
      const correctionKeys = ['correction:latest', 'correction:history'];
      const corrections = [];
      for (const key of correctionKeys) {
        const result = await state.router.memoryLoad('L3', key);
        if (result.success && result.data) corrections.push(result.data);
      }
      return okResult(JSON.stringify(corrections, null, 2), { count: corrections.length });
    },
  });

  api.registerTool({
    name: 'zcrystal_memory_add',
    label: 'ZCrystal Memory Add (HOT)',
    description: 'Add a line to HOT memory (L1)',
    parameters: Type.Object({ content: Type.String() }),
    async execute(_id, params) {
      await state.router.memoryStoreData('L1', `hot:${Date.now()}`, params.content);
      return okResult('Added to HOT memory (L1)');
    },
  });

  api.registerTool({
    name: 'zcrystal_memory_get',
    label: 'ZCrystal Memory Get (HOT)',
    description: 'Get HOT memory content from L1',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const result = await state.router.memoryLoad('L1', 'hot:latest');
      if (result.success) return okResult(String(result.data || 'No HOT memory'));
      return errResult('No HOT memory found');
    },
  });

  api.registerTool({
    name: 'zcrystal_pattern_add',
    label: 'ZCrystal Pattern Add',
    description: 'Add a successful pattern to L3 memory',
    parameters: Type.Object({ pattern: Type.String(), description: Type.String() }),
    async execute(_id, params) {
      await state.router.memoryStoreData('L3', `pattern:${params.pattern}`, params.description);
      return okResult('Pattern stored in L3');
    },
  });

  api.registerTool({
    name: 'zcrystal_pattern_list',
    label: 'ZCrystal Pattern List',
    description: 'List patterns from L3 memory',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const result = await state.router.memoryLoad('L3', 'patterns:list');
      return okResult(result.success ? String(result.data) : 'No patterns yet');
    },
  });

  // Proactive Session Tracker
  api.registerTool({
    name: 'zcrystal_session_set',
    label: 'ZCrystal Session Set',
    description: 'Set current task/decision in session tracker',
    parameters: Type.Object({
      topic: Type.String(), task: Type.String(),
      decision: Type.Optional(Type.String()), nextMove: Type.Optional(Type.String()),
      blockers: Type.Optional(Type.String()),
    }),
    async execute(_id, params) {
      const sessionData = {
        timestamp: new Date().toISOString(),
        topic: params.topic, task: params.task,
        decision: params.decision || '', nextMove: params.nextMove || '', blockers: params.blockers || ''
      };
      await state.router.memoryStoreData('L2', 'session:current', JSON.stringify(sessionData));
      return okResult('Session updated: ' + params.topic);
    },
  });

  api.registerTool({
    name: 'zcrystal_session_get',
    label: 'ZCrystal Session Get',
    description: 'Get current session state',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const result = await state.router.memoryLoad('L2', 'session:current');
      if (result.success) return okResult(String(result.data ?? 'No active session'));
      return errResult(result.error ?? 'Session get failed');
    },
  });

  api.registerTool({
    name: 'zcrystal_session_clear',
    label: 'ZCrystal Session Clear',
    description: 'Clear current session',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      await state.router.memoryStoreData('L2', 'session:current', '');
      return okResult('Session cleared');
    },
  });

  api.registerTool({
    name: 'zcrystal_proactive_check',
    label: 'ZCrystal Proactive Check',
    description: 'Run proactive check for pending follow-ups and blockers',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const sessionResult = await state.router.memoryLoad('L2', 'session:current');
      const suggestions = state.reviewEngine.getUpgradeSuggestions();
      let message = 'Proactive check complete. ';
      if (sessionResult.success && sessionResult.data) {
        try {
          const session = JSON.parse(String(sessionResult.data));
          if (session.blockers) message += `Active blocker: ${session.blockers}. `;
          if (session.nextMove) message += `Next move: ${session.nextMove}. `;
        } catch { /* ignore */ }
      }
      if (suggestions.length > 0) message += `${suggestions.length} skill upgrade suggestions available.`;
      else message += 'No immediate action needed.';
      return okResult(message, { suggestionsCount: suggestions.length });
    },
  });

  api.registerTool({
    name: 'zcrystal_proactive_suggest',
    label: 'ZCrystal Proactive Suggest',
    description: 'Get proactive suggestions based on patterns and history',
    parameters: Type.Object({ context: Type.Optional(Type.String()) }),
    async execute(_id, params) {
      const suggestions = state.reviewEngine.getUpgradeSuggestions();
      const patterns = await state.router.memoryLoad('L3', 'patterns:list');
      const result = {
        skillSuggestions: suggestions.slice(0, 3),
        learnedPatterns: patterns.success ? String(patterns.data).split('\n').filter(Boolean) : [],
        context: params.context || 'general'
      };
      return okResult(JSON.stringify(result, null, 2), result);
    },
  });

  api.registerTool({
    name: 'zcrystal_proactive_log',
    label: 'ZCrystal Proactive Log',
    description: 'Log a proactive action taken',
    parameters: Type.Object({ action: Type.String(), outcome: Type.String() }),
    async execute(_id, params) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await state.router.memoryStoreData('L2', `proactive:${timestamp}`, `${params.action} -> ${params.outcome}`);
      return okResult('Proactive action logged');
    },
  });

  api.registerTool({
    name: 'zcrystal_proactive_recent',
    label: 'ZCrystal Proactive Recent',
    description: 'Get recent proactive actions',
    parameters: Type.Object({ limit: Type.Optional(Type.Number()) }),
    async execute(_id, _params) {
      const result = await state.router.memoryLoad('L2', 'proactive:recent');
      return okResult(result.success ? String(result.data || 'No recent proactive actions') : 'No recent actions');
    },
  });

  api.registerTool({
    name: 'zcrystal_log_action',
    label: 'ZCrystal Log Action',
    description: 'Log a proactive action to L2',
    parameters: Type.Object({ action: Type.String(), result: Type.String() }),
    async execute(_id, params) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await state.router.memoryStoreData('L2', `action:${timestamp}`, `${params.action}: ${params.result}`);
      return okResult('Action logged to L2');
    },
  });

  api.registerTool({
    name: 'zcrystal_log_recent',
    label: 'ZCrystal Log Recent',
    description: 'Get recent action logs from L2',
    parameters: Type.Object({ limit: Type.Optional(Type.Number()) }),
    async execute(_id, _params) {
      const result = await state.router.memoryLoad('L2', 'recent_actions');
      return okResult(result.success ? String(result.data) : 'No recent actions');
    },
  });

  // Webhook Tools
  api.registerTool({
    name: 'zcrystal_webhook_telegram',
    label: 'ZCrystal Webhook Telegram',
    description: 'Handle incoming Telegram webhook',
    parameters: Type.Object({ payload: Type.Record(Type.String(), Type.Any()) }),
    async execute(_id, params) {
      const result = await state.router.telegramWebhook(params.payload);
      if (result.success) return okResult(JSON.stringify(result.data, null, 2));
      return errResult(result.error ?? 'Telegram webhook failed');
    },
  });

  api.registerTool({
    name: 'zcrystal_webhook_signal',
    label: 'ZCrystal Webhook Signal',
    description: 'Handle incoming Signal webhook',
    parameters: Type.Object({ payload: Type.Record(Type.String(), Type.Any()) }),
    async execute(_id, params) {
      const result = await state.router.signalWebhook(params.payload);
      if (result.success) return okResult(JSON.stringify(result.data, null, 2));
      return errResult(result.error ?? 'Signal webhook failed');
    },
  });

  api.registerTool({
    name: 'zcrystal_webhook_generic',
    label: 'ZCrystal Webhook Generic',
    description: 'Handle incoming generic webhook',
    parameters: Type.Object({ payload: Type.Record(Type.String(), Type.Any()) }),
    async execute(_id, params) {
      const result = await state.router.genericWebhook(params.payload);
      if (result.success) return okResult(JSON.stringify(result.data, null, 2));
      return errResult(result.error ?? 'Generic webhook failed');
    },
  });

  // Heartbeat
  api.registerTool({
    name: 'zcrystal_heartbeat_run',
    label: 'ZCrystal Heartbeat Run',
    description: 'Run heartbeat maintenance check',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const status = await state.router.getEvolutionStatus();
      const memoryStats = await state.router.memoryStats();
      return okResult(JSON.stringify({
        lastRun: Date.now(),
        evolutionRunning: status.data?.running || false,
        memoryLayers: memoryStats.success ? 'OK' : 'Error'
      }, null, 2));
    },
  });

  api.registerTool({
    name: 'zcrystal_heartbeat_status',
    label: 'ZCrystal Heartbeat Status',
    description: 'Get heartbeat engine status',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const status = await state.router.healthCheck();
      const evo = await state.router.getEvolutionStatus();
      return okResult(JSON.stringify({ health: status.success, evolution: evo.data, timestamp: Date.now() }, null, 2));
    },
  });

  api.registerTool({
    name: 'zcrystal_layers_exchange',
    label: 'ZCrystal Layers Exchange',
    description: 'Run layer exchange',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      return okResult('Layer exchange is automatic via MemoryLayers - use memory_stats to monitor', {});
    },
  });

  api.registerTool({
    name: 'zcrystal_predict',
    label: 'ZCrystal Predict Needs',
    description: 'Predict user needs',
    parameters: Type.Object({ context: Type.String() }),
    async execute(_id, params) {
      const suggestions = state.reviewEngine.getUpgradeSuggestions();
      return okResult(JSON.stringify({ suggestions: suggestions.slice(0, 3).map((s: { reason: unknown }) => s.reason), confidence: 0.6 }, null, 2));
    },
  });

  api.registerTool({
    name: 'zcrystal_selfimproving_status',
    label: 'ZCrystal Self-Improving Status',
    description: 'Get full self-improving system status',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const health = await state.router.healthCheck();
      const evo = await state.router.getEvolutionStatus();
      const memStats = await state.router.memoryStats();
      const reviewStats = state.reviewEngine.getStats();
      return okResult(JSON.stringify({ system: 'ZCrystal Plugin', version: '0.6.0', health: health.success, evolution: evo.data, memory: memStats.data, review: reviewStats }, null, 2));
    },
  });
}
