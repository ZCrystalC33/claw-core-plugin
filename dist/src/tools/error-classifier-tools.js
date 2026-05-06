/**
 * ErrorClassifier Tools - Bridge to Python efficiency_core.error_classifier (ErrorClassifier)
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

export function registerErrorClassifierTools(api) {
  api.registerTool({
    name: 'clawcore_error_classifier_classify',
    label: '🔧 ErrorClassifier.classify',
    description: 'ErrorClassifier.classify',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.error_classifier import ErrorClassifier; print(str(ErrorClassifier().classify()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
