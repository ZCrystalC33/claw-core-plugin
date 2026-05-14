// Benchmark Tools - Bridge to Python efficiency_core.benchmark
import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPython(script: string): string {
  return execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8',
    cwd: CORE_CWD,
    timeout: 30000,
  }).trim();
}

export function registerBenchmarkTools(api: any) {
  api.registerTool({
    name: 'clawcore_benchmark_run',
    label: '🔧 Benchmark.run',
    description: 'Run all ClawCore benchmarks (decompose, route, quick_run, efficiency_core.run)',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      try {
        const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.benchmark import run_all_benchmarks

result = run_all_benchmarks()
print(result)
`;
        const raw = runPython(script);
        return okResult(raw, { type: 'benchmark_results' });
      } catch (e: unknown) {
        return errResult(`Benchmark failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  });

  api.registerTool({
    name: 'clawcore_benchmark_get_results',
    label: '🔧 Benchmark.get_results',
    description: 'Get stored benchmark results',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      try {
        const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.benchmark import load_benchmark_result

try:
    result = load_benchmark_result()
    print(json.dumps(result, default=str))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;
        const raw = runPython(script);
        return okResult(raw);
      } catch (e: unknown) {
        return errResult(`Get results failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  });

  api.registerTool({
    name: 'clawcore_benchmark_summary',
    label: '🔧 Benchmark.summary',
    description: 'Get benchmark summary for all tests',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      try {
        const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.benchmark import run_all_benchmarks, BenchmarkSuite

suite = BenchmarkSuite()
suite.register('decompose', lambda: None)
suite.register('router.route', lambda: None)
suite.register('quick_run', lambda: None)

result = run_all_benchmarks()
print(result)
`;
        const raw = runPython(script);
        return okResult(raw);
      } catch (e: unknown) {
        return errResult(`Benchmark summary failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  });
}