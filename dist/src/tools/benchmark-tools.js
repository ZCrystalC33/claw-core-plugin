/**
 * Benchmark Tools - Bridge to Python efficiency_core.benchmark (run_benchmark)
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

export function registerBenchmarkTools(api) {
  api.registerTool({
    name: 'clawcore_benchmark_run',
    label: '🔧 Benchmark.run',
    description: 'run_benchmark.run',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.benchmark import run_benchmark; print(str(run_benchmark().run()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_benchmark_get_results',
    label: '🔧 Benchmark.get_results',
    description: 'run_benchmark.get_results',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.benchmark import run_benchmark; print(str(run_benchmark().get_results()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
