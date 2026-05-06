/**
 * Rate Limit Tools - Bridge to Python efficiency_core RateLimiter
 */
import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPython(script) {
    try {
        return execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
            cwd: CORE_CWD,
            timeout: 15,
            encoding: 'utf8',
        }).trim();
    } catch (e) {
        return null;
    }
}

export function registerRateLimitTools(api) {
    api.registerTool({
        name: 'clawcore_rate_limit_check',
        label: '⚡ ClawCore Rate Limit Check',
        description: 'Check if action is allowed under rate limit for a bucket and key',
        parameters: Type.Object({
            bucket: Type.String({ description: 'Bucket name' }),
            key: Type.String({ description: 'Key within the bucket' }),
        }),
        async execute(_id, _params) {
            const params = _params;
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.rate_limit import RateLimiter
rl = RateLimiter()
try:
    result = rl.check('${params.bucket}', '${params.key}')
    print('allowed' if result and result[0] else 'denied')
except Exception as e:
    print('error:', str(e)[:50])
`;
            const raw = runPython(script);
            return okResult(raw || 'check_failed');
        },
    });

    api.registerTool({
        name: 'clawcore_rate_limit_add',
        label: '➕ ClawCore Add Rate Limit Bucket',
        description: 'Add a rate limit bucket with max calls and window',
        parameters: Type.Object({
            bucket: Type.String({ description: 'Bucket name' }),
            max_calls: Type.Number({ description: 'Max calls per window' }),
            window_seconds: Type.Number({ description: 'Window size in seconds' }),
        }),
        async execute(_id, _params) {
            const params = _params;
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.rate_limit import RateLimiter
rl = RateLimiter()
rl.add_limit('${params.bucket}', ${params.max_calls}, ${params.window_seconds})
print('bucket_added')
`;
            const raw = runPython(script);
            return okResult(raw || 'bucket_added');
        },
    });

    api.registerTool({
        name: 'clawcore_rate_limit_stats',
        label: '📊 ClawCore Rate Limit Stats',
        description: 'Get all rate limiter buckets and their limits',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.rate_limit import RateLimiter
rl = RateLimiter()
limits = rl.get_limit()
print(str(limits))
`;
            const raw = runPython(script);
            return okResult(raw || 'no_stats');
        },
    });
}
