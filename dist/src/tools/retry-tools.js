/**
 * Retry Tools - Bridge to Python efficiency_core.retry (RetryPolicy)
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

export function registerRetryTools(api) {
  api.registerTool({
    name: 'clawcore_retry_execute',
    label: '🔧 Retry.execute',
    description: 'RetryPolicy.execute',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.retry import RetryPolicy; print(str(RetryPolicy().execute()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_retry_get_stats',
    label: '🔧 Retry.get_stats',
    description: 'RetryPolicy.get_stats',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.retry import RetryPolicy; print(str(RetryPolicy().get_stats()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
