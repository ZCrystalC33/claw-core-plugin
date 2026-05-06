/**
 * Lock Tools - Bridge to Python efficiency_core.lock (LockManager)
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

export function registerLockTools(api) {
  api.registerTool({
    name: 'clawcore_lock_acquire',
    label: '🔧 Lock.acquire',
    description: 'LockManager.acquire',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.lock import LockManager; print(str(LockManager().acquire()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_lock_release',
    label: '🔧 Lock.release',
    description: 'LockManager.release',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.lock import LockManager; print(str(LockManager().release()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_lock_is_locked',
    label: '🔧 Lock.is_locked',
    description: 'LockManager.is_locked',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.lock import LockManager; print(str(LockManager().is_locked()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
