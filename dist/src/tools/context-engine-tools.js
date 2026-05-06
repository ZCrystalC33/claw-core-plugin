/**
 * ContextEngine Tools - Bridge to Python efficiency_core.context_engine (ContextEngine)
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

export function registerContextEngineTools(api) {
  api.registerTool({
    name: 'clawcore_context_engine_build',
    label: '🔧 ContextEngine.build',
    description: 'ContextEngine.build',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.context_engine import ContextEngine; print(str(ContextEngine().build()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_context_engine_compress',
    label: '🔧 ContextEngine.compress',
    description: 'ContextEngine.compress',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.context_engine import ContextEngine; print(str(ContextEngine().compress()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
