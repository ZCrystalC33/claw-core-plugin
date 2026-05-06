/**
 * Registry Tools - Bridge to Python efficiency_core.registry (TeamRegistry)
 */
import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPython(script) {
  try {
    return execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8', cwd: CORE_CWD, timeout: 15000,
    }).trim();
  } catch (e) { return null; }
}

export function registerRegistryTools(api) {
  api.registerTool({
    name: 'clawcore_registry_get_all_members',
    label: '🔧 Registry.get_all_members',
    description: 'TeamRegistry.get_all_members',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.registry import TeamRegistry; print(str(TeamRegistry().get_all_members()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_registry_get_available_members',
    label: '🔧 Registry.get_available_members',
    description: 'TeamRegistry.get_available_members',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.registry import TeamRegistry; print(str(TeamRegistry().get_available_members()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_registry_get_load_stats',
    label: '🔧 Registry.get_load_stats',
    description: 'TeamRegistry.get_load_stats',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.registry import TeamRegistry; print(str(TeamRegistry().get_load_stats()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
