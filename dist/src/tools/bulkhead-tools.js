/**
 * Bulkhead Tools - Bridge to Python efficiency_core.bulkhead (Bulkhead)
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

export function registerBulkheadTools(api) {
  api.registerTool({
    name: 'clawcore_bulkhead_acquire',
    label: '🔧 Bulkhead.acquire',
    description: 'Bulkhead.acquire',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.bulkhead import Bulkhead; print(str(Bulkhead().acquire()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_bulkhead_release',
    label: '🔧 Bulkhead.release',
    description: 'Bulkhead.release',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.bulkhead import Bulkhead; print(str(Bulkhead().release()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_bulkhead_get_stats',
    label: '🔧 Bulkhead.get_stats',
    description: 'Bulkhead.get_stats',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.bulkhead import Bulkhead; print(str(Bulkhead().get_stats()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
