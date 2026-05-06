/**
 * Features Tools - Bridge to Python efficiency_core.features (FeatureFlags)
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

export function registerFeaturesTools(api) {
  api.registerTool({
    name: 'clawcore_features_is_enabled',
    label: '🔧 Features.is_enabled',
    description: 'FeatureFlags.is_enabled',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.features import FeatureFlags; print(str(FeatureFlags().is_enabled()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_features_enable',
    label: '🔧 Features.enable',
    description: 'FeatureFlags.enable',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.features import FeatureFlags; print(str(FeatureFlags().enable()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_features_disable',
    label: '🔧 Features.disable',
    description: 'FeatureFlags.disable',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.features import FeatureFlags; print(str(FeatureFlags().disable()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
