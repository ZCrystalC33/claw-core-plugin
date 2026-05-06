/**
 * CredentialPool Tools - Bridge to Python efficiency_core.credential_pool (CredentialPool)
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

export function registerCredentialPoolTools(api) {
  api.registerTool({
    name: 'clawcore_credential_pool_get',
    label: '🔧 CredentialPool.get',
    description: 'CredentialPool.get',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.credential_pool import CredentialPool; print(str(CredentialPool().get()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_credential_pool_release',
    label: '🔧 CredentialPool.release',
    description: 'CredentialPool.release',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.credential_pool import CredentialPool; print(str(CredentialPool().release()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_credential_pool_get_stats',
    label: '🔧 CredentialPool.get_stats',
    description: 'CredentialPool.get_stats',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.credential_pool import CredentialPool; print(str(CredentialPool().get_stats()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
