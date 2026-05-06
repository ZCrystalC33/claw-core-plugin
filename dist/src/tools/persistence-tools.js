/**
 * Persistence Tools - Bridge to Python efficiency_core.persistence (PersistenceManager)
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

export function registerPersistenceTools(api) {
  api.registerTool({
    name: 'clawcore_persistence_save',
    label: '🔧 Persistence.save',
    description: 'PersistenceManager.save',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.persistence import PersistenceManager; print(str(PersistenceManager().save()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_persistence_load',
    label: '🔧 Persistence.load',
    description: 'PersistenceManager.load',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.persistence import PersistenceManager; print(str(PersistenceManager().load()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_persistence_delete',
    label: '🔧 Persistence.delete',
    description: 'PersistenceManager.delete',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.persistence import PersistenceManager; print(str(PersistenceManager().delete()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
