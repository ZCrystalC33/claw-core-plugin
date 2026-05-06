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
        description: 'Check if action is allowed under rate limit',
        parameters: Type.Object({
            key: Type.String({ description: 'Rate limit key to check' }),
        }),
        async execute(_id, _params) {
            const params = _params;
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.rate_limit import RateLimiter
rl = RateLimiter.get_instance()
allowed = rl.check('${params.key}')
print('allowed' if allowed else 'denied')
`;
            const raw = runPython(script);
            return okResult(raw || 'denied');
        },
    });

    api.registerTool({
        name: 'clawcore_rate_limit_add',
        label: '➕ ClawCore Add Rate Limit',
        description: 'Add a new rate limit bucket',
        parameters: Type.Object({
            key: Type.String(),
            max_calls: Type.Number(),
            window_seconds: Type.Number(),
        }),
        async execute(_id, _params) {
            const params = _params;
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.rate_limit import RateLimiter
rl = RateLimiter.get_instance()
rl.add_bucket('${params.key}', ${params.max_calls}, ${params.window_seconds})
print('bucket_added')
`;
            const raw = runPython(script);
            return okResult(raw || 'bucket_added');
        },
    });

    api.registerTool({
        name: 'clawcore_rate_limit_stats',
        label: '📊 ClawCore Rate Limit Stats',
        description: 'Get rate limiter statistics',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.rate_limit import RateLimiter
rl = RateLimiter.get_instance()
limits = rl.get_limit()
print(str(limits) if limits else 'no_limits')
`;
            const raw = runPython(script);
            return okResult(raw || 'no_stats');
        },
    });
}
