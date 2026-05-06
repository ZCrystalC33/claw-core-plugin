/**
 * Middleware Tools - Bridge to Python efficiency_core.middleware (MiddlewareChain)
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

export function registerMiddlewareTools(api) {
  api.registerTool({
    name: 'clawcore_middleware_add',
    label: '🔧 Middleware.add',
    description: 'MiddlewareChain.add',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.middleware import MiddlewareChain; print(str(MiddlewareChain().add()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_middleware_process',
    label: '🔧 Middleware.process',
    description: 'MiddlewareChain.process',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.middleware import MiddlewareChain; print(str(MiddlewareChain().process()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_middleware_clear',
    label: '🔧 Middleware.clear',
    description: 'MiddlewareChain.clear',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.middleware import MiddlewareChain; print(str(MiddlewareChain().clear()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
