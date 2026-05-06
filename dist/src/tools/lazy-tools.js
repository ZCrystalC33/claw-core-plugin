/**
 * Lazy Tools - Bridge to Python efficiency_core.lazy (LazyCore)
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

export function registerLazyTools(api) {
  api.registerTool({
    name: 'clawcore_lazy_get_core',
    label: '🔧 Lazy.get_core',
    description: 'LazyCore.get_core',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.lazy import LazyCore; print(str(LazyCore().get_core()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_lazy_run',
    label: '🔧 Lazy.run',
    description: 'LazyCore.run',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.lazy import LazyCore; print(str(LazyCore().run()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_lazy_get_decomposer',
    label: '🔧 Lazy.get_decomposer',
    description: 'LazyCore.get_decomposer',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.lazy import LazyCore; print(str(LazyCore().get_decomposer()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
