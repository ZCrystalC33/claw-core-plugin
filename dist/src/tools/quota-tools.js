/**
 * Quota Tools - Bridge to Python efficiency_core.quota (QuotaManager)
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

export function registerQuotaTools(api) {
  api.registerTool({
    name: 'clawcore_quota_check_available',
    label: '🔧 Quota.check_available',
    description: 'QuotaManager.check_available',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.quota import QuotaManager; print(str(QuotaManager().check_available()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_quota_allocate',
    label: '🔧 Quota.allocate',
    description: 'QuotaManager.allocate',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.quota import QuotaManager; print(str(QuotaManager().allocate()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_quota_get_quota',
    label: '🔧 Quota.get_quota',
    description: 'QuotaManager.get_quota',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.quota import QuotaManager; print(str(QuotaManager().get_quota()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
