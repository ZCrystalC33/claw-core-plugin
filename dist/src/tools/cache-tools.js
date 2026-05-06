/**
 * Cache Tools - Bridge to Python efficiency_core.cache (TwoLevelCache)
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

export function registerCacheTools(api) {
  api.registerTool({
    name: 'clawcore_cache_get',
    label: '🔧 Cache.get',
    description: 'TwoLevelCache.get',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.cache import TwoLevelCache; print(str(TwoLevelCache().get()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_cache_set',
    label: '🔧 Cache.set',
    description: 'TwoLevelCache.set',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.cache import TwoLevelCache; print(str(TwoLevelCache().set()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_cache_delete',
    label: '🔧 Cache.delete',
    description: 'TwoLevelCache.delete',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.cache import TwoLevelCache; print(str(TwoLevelCache().delete()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_cache_clear',
    label: '🔧 Cache.clear',
    description: 'TwoLevelCache.clear',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.cache import TwoLevelCache; print(str(TwoLevelCache().clear()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
