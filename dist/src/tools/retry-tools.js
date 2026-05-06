/**
 * Retry Tools - Bridge to Python efficiency_core.retry (RetryPolicy)
 */
import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPython(script, timeoutMs = 15000) {
    try {
        const result = execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
            encoding: 'utf-8',
            cwd: CORE_CWD,
            timeout: timeoutMs / 1000,
        }).trim();
        return result;
    } catch (e) {
        return null;
    }
}

export function registerRetryTools(api) {
    // ─── Execute with Retry ───────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_retry_execute',
        label: '🔁 ClawCore Retry Execute',
        description: 'Execute a callable with retry policy',
        parameters: Type.Object({
            callable: Type.String({ description: 'Python callable (e.g. lambda: 1/0 or function name)' }),
            max_attempts: Type.Optional(Type.Number({ description: 'Max retry attempts (default: 3)' })),
        }),
        async execute(_id, _params) {
            const params = _params;
            const maxAttempts = params.max_attempts || 3;
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.retry import RetryPolicy

config = type('RetryConfig', (), {
    'max_attempts': ${maxAttempts},
    'base_delay': 1.0,
    'max_delay': 10.0,
    'exponential_base': 2,
})()

policy = RetryPolicy(config)

def runnable():
    fn = ${params.callable}
    return fn()

result = policy.execute(runnable)
print(json.dumps(result))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            try { return okResult(raw); }
            catch (e) { return errResult('Failed to parse result: ' + raw); }
        },
    });

    // ─── Get Retry Stats ──────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_retry_stats',
        label: '📊 ClawCore Retry Stats',
        description: 'Get retry policy statistics',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.retry import RetryPolicy

policy = RetryPolicy()
try:
    stats = policy.get_stats()
    print(json.dumps(stats))
except:
    cfg = policy.config
    print(json.dumps({
        'max_attempts': cfg.max_attempts if cfg else 3,
        'base_delay': getattr(cfg, 'base_delay', 1.0),
        'max_delay': getattr(cfg, 'max_delay', 10.0),
    }))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── Test Retry (simple test call) ───────────────────────────────
    api.registerTool({
        name: 'clawcore_retry_test',
        label: '🧪 ClawCore Retry Test',
        description: 'Test retry policy with a failing then succeeding callable',
        parameters: Type.Object({
            fail_count: Type.Optional(Type.Number({ description: 'Number of failures before success (default: 2)' })),
        }),
        async execute(_id, _params) {
            const params = _params;
            const failCount = params.fail_count || 2;
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.retry import RetryPolicy

config = type('RetryConfig', (), {
    'max_attempts': 5,
    'base_delay': 0.1,
    'max_delay': 1.0,
    'exponential_base': 2,
})()
policy = RetryPolicy(config)

attempt = [0]
def test_fn():
    attempt[0] += 1
    if attempt[0] < ${failCount}:
        raise RuntimeError(f"Attempt {attempt[0]} failed as expected")
    return f"success on attempt {attempt[0]}"

result = policy.execute(test_fn)
print(json.dumps({'success': True, 'attempts': attempt[0], 'result': str(result)}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });
}