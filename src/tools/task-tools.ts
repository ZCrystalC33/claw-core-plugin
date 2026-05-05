/**
 * Task, Memory, and Router Tools
 */

import { Type } from '@sinclair/typebox';
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import type { PluginState } from '../index.js';
import { okResult, errResult } from '../index.js';

export function registerTaskTools(api: OpenClawPluginApi, state: PluginState) {
  // zcrystal_task_create
  api.registerTool({
    name: 'zcrystal_task_create',
    label: 'ZCrystal Task Create',
    description: 'Create a new task',
    parameters: Type.Object({
      task_type: Type.String(), 
      trigger: Type.Union([Type.Literal('telegram'), Type.Literal('signal'), Type.Literal('webhook'), Type.Literal('cron'), Type.Literal('manual')]),
      user_id: Type.String(), 
      repr: Type.String(),
      input: Type.Optional(Type.Record(Type.String(), Type.Any())),
      max_retries: Type.Optional(Type.Number()),
    }),
    async execute(_id, params) {
      const result = await state.router.createTask({
        task_type: params.task_type,
        trigger: params.trigger,
        user_id: params.user_id,
        repr: params.repr,
        input: params.input || {},
        max_retries: params.max_retries,
      });
      if (result.success) return okResult('Task created', result.data);
      return errResult(result.error ?? 'Task creation failed');
    },
  });

  // zcrystal_task_get
  api.registerTool({
    name: 'zcrystal_task_get',
    label: 'ZCrystal Task Get',
    description: 'Get task by ID',
    parameters: Type.Object({ taskId: Type.String() }),
    async execute(_id, params) {
      const result = await state.router.getTask(params.taskId);
      if (result.success) return okResult('Task retrieved', result.data);
      return errResult(result.error ?? 'Task not found');
    },
  });

  // zcrystal_task_stats
  api.registerTool({
    name: 'zcrystal_task_stats',
    label: 'ZCrystal Task Stats',
    description: 'Get task system statistics',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const result = await state.router.getTaskStats();
      if (result.success) return okResult(JSON.stringify(result.data, null, 2));
      return errResult(result.error ?? 'Failed to get task stats');
    },
  });

  // zcrystal_memory_store
  api.registerTool({
    name: 'zcrystal_memory_store',
    label: 'ZCrystal Memory Store',
    description: 'Store data in memory L1-L5',
    parameters: Type.Object({
      layer: Type.String(), key: Type.String(), value: Type.Any(), ttl: Type.Optional(Type.Number()),
    }),
    async execute(_id, params) {
      const result = await state.router.memoryStoreData(params.layer, params.key, params.value, params.ttl);
      if (result.success) return okResult('Memory stored in ' + params.layer);
      return errResult(result.error ?? 'Memory store failed');
    },
  });

  // zcrystal_memory_load
  api.registerTool({
    name: 'zcrystal_memory_load',
    label: 'ZCrystal Memory Load',
    description: 'Load from memory layers',
    parameters: Type.Object({ layer: Type.String(), key: Type.String() }),
    async execute(_id, params) {
      const result = await state.router.memoryLoad(params.layer, params.key);
      if (result.success) return okResult(String(result.data ?? 'Memory not found'));
      return errResult(result.error ?? 'Memory load failed');
    },
  });

  // zcrystal_memory_search
  api.registerTool({
    name: 'zcrystal_memory_search',
    label: 'ZCrystal Memory Search',
    description: 'Search memory across all layers',
    parameters: Type.Object({ query: Type.String() }),
    async execute(_id, params) {
      const result = await state.router.memorySearch(params.query);
      if (result?.success) return okResult(JSON.stringify(result.data, null, 2), { count: result.data?.length });
      return errResult('Memory search failed');
    },
  });

  // zcrystal_memory_delete
  api.registerTool({
    name: 'zcrystal_memory_delete',
    label: 'ZCrystal Memory Delete',
    description: 'Delete a memory entry',
    parameters: Type.Object({ layer: Type.String(), key: Type.String() }),
    async execute(_id, params) {
      const result = await state.router.memoryDelete(params.layer, params.key);
      if (result?.success) return okResult('Memory deleted');
      return errResult('Memory delete failed');
    },
  });

  // zcrystal_memory_stats
  api.registerTool({
    name: 'zcrystal_memory_stats',
    label: 'ZCrystal Memory Stats',
    description: 'Get memory system statistics',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const result = await state.router.memoryStats();
      if (result?.success) return okResult(JSON.stringify(result.data, null, 2));
      return errResult('Memory stats failed');
    },
  });

  // zcrystal_model_pick
  api.registerTool({
    name: 'zcrystal_model_pick',
    label: 'ZCrystal Model Pick',
    description: 'Pick best model for task',
    parameters: Type.Object({ taskType: Type.String(), constraints: Type.Optional(Type.Record(Type.String(), Type.Any())) }),
    async execute(_id, params) {
      const result = await state.router.pickModel(params.taskType, params.constraints);
      if (result.success) return okResult('Model selected', result.data);
      return errResult(result.error ?? 'Model pick failed');
    },
  });

  // zcrystal_router_list
  api.registerTool({
    name: 'zcrystal_router_list',
    label: 'ZCrystal Router List',
    description: 'List all available models in router',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const result = await state.router.listModels();
      if (result.success) return okResult(JSON.stringify(result.data, null, 2), { count: result.data?.models?.length || 0 });
      return errResult(result.error ?? 'Failed to list models');
    },
  });

  // zcrystal_evo_ready
  api.registerTool({
    name: 'zcrystal_evo_ready',
    label: 'ZCrystal Evo Ready',
    description: 'Check if ZCrystal_evo is ready',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const result = await state.router.readinessCheck();
      if (result?.success) return okResult('ZCrystal_evo is ready');
      return errResult('ZCrystal_evo is not ready');
    },
  });
}
