/**
 * Benchmark Tools - Bridge to Python efficiency_core.benchmark
 */
import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPython(script) {
    try {
        return execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
            encoding: 'utf-8',
            cwd: CORE_CWD,
            timeout: 30000,
        }).trim();
    } catch (e) {
        return null;
    }
}

export function registerBenchmarkTools(api) {
    // ─── Run All Benchmarks ─────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_benchmark_run_all',
        label: '📊 ClawCore Benchmark Run All',
        description: 'Run all registered benchmarks with specified iterations',
        parameters: Type.Object({
            iterations: Type.Optional(Type.Integer({ description: 'Number of iterations (default: 50)' })),
        }),
        async execute(_id, _params) {
            const p = _params;
            const iters = p.iterations || 50;
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.benchmark import run_all_benchmarks

result = run_all_benchmarks(iterations=${iters})
print(result)
`;
            const raw = runPython(script);
            if (!raw) return errResult('Benchmark run failed');
            return okResult(raw);
        },
    });

    // ─── Run Core Benchmarks ─────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_benchmark_run_core',
        label: '⚡ ClawCore Benchmark Run Core',
        description: 'Run core benchmarks (memory, cache, etc.)',
        parameters: Type.Object({
            iterations: Type.Optional(Type.Integer({ description: 'Number of iterations (default: 50)' })),
        }),
        async execute(_id, _params) {
            const p = _params;
            const iters = p.iterations || 50;
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.benchmark import run_core_benchmarks

result = run_core_benchmarks(iterations=${iters})
print(result)
`;
            const raw = runPython(script);
            if (!raw) return errResult('Core benchmark run failed');
            return okResult(raw);
        },
    });

    // ─── Run Single Benchmark ─────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_benchmark_run_single',
        label: '🎯 ClawCore Benchmark Run Single',
        description: 'Run a specific named benchmark',
        parameters: Type.Object({
            name: Type.String({ description: 'Benchmark name to run' }),
            iterations: Type.Optional(Type.Integer({ description: 'Number of iterations (default: 100)' })),
            warmup: Type.Optional(Type.Integer({ description: 'Warmup iterations (default: 10)' })),
        }),
        async execute(_id, _params) {
            const p = _params;
            const iters = p.iterations || 100;
            const warmup = p.warmup || 10;
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.benchmark import BenchmarkSuite

suite = BenchmarkSuite(name='single')
result = suite.run('${p.name}', iterations=${iters}, warmup=${warmup})
print(json.dumps({
    'name': result.name,
    'iterations': result.iterations,
    'total_time_ms': round(result.total_time_ms, 3),
    'avg_time_ms': round(result.avg_time_ms, 3),
    'min_time_ms': round(result.min_time_ms, 3),
    'max_time_ms': round(result.max_time_ms, 3),
    'std_dev_ms': round(result.std_dev_ms, 3),
    'median_ms': round(result.median_ms, 3),
    'p95_ms': round(result.p95_ms, 3),
    'timestamp': str(result.timestamp)
}, default=str))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Benchmark run failed');
            try {
                return okResult(raw);
            } catch {
                return okResult(raw);
            }
        },
    });

    // ─── List Available Benchmarks ───────────────────────────────────
    api.registerTool({
        name: 'clawcore_benchmark_list',
        label: '📋 ClawCore Benchmark List',
        description: 'List available benchmarks in the suite',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.benchmark import BenchmarkSuite

suite = BenchmarkSuite(name='list')
benchmarks = suite.list_all() if hasattr(suite, 'list_all') else []
print(json.dumps(benchmarks))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Benchmark list failed');
            return okResult(raw);
        },
    });

    // ─── Save Benchmark Result ────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_benchmark_save',
        label: '💾 ClawCore Benchmark Save',
        description: 'Save a benchmark result to file',
        parameters: Type.Object({
            name: Type.String({ description: 'Benchmark result name' }),
            path: Type.Optional(Type.String({ description: 'Output file path' })),
        }),
        async execute(_id, _params) {
            const p = _params;
            const out_path = p.path || '/tmp/benchmark_result.json';
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.benchmark import BenchmarkSuite, save_benchmark_result

suite = BenchmarkSuite(name='save')
result = suite.run('${p.name}')
save_benchmark_result(result, '${out_path}')
print('saved:${out_path}')
`;
            const raw = runPython(script);
            if (!raw) return errResult('Benchmark save failed');
            return okResult(raw);
        },
    });

    // ─── Compare Benchmarks ──────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_benchmark_compare',
        label: '📈 ClawCore Benchmark Compare',
        description: 'Compare two benchmark results',
        parameters: Type.Object({
            path_a: Type.String({ description: 'Path to first benchmark result JSON' }),
            path_b: Type.String({ description: 'Path to second benchmark result JSON' }),
        }),
        async execute(_id, _params) {
            const p = _params;
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.benchmark import BenchmarkSuite, load_benchmark_result

result_a = load_benchmark_result('${p.path_a}')
result_b = load_benchmark_result('${p.path_b}')
suite = BenchmarkSuite(name='compare')
comparison = suite.compare(result_a, result_b)
print(json.dumps(comparison, default=str))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Benchmark compare failed');
            try {
                return okResult(raw);
            } catch {
                return okResult(raw);
            }
        },
    });
}