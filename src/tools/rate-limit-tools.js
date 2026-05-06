import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

export function registerRateLimitTools(api) {
    api.registerTool({
        name: 'clawcore_rate_limit_check',
        label: '⚡ ClawCore Rate Limit',
        description: 'Check rate limit status for a key',
        parameters: Type.Object({
            key: Type.String(),
        }),
        async execute(_id, _params) {
            const params = _params;
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.rate_limit import RateLimiter
rl = RateLimiter()
result = rl.check('${params.key}')
print({'allowed': result, 'key': '${params.key}'})
`.replace(/'/g, "\\'");
            let raw;
            try {
                raw = execSync(`python3 -c "${script}"`, {cwd: CORE_CWD, timeout: 15, encoding: 'utf8'}).trim();
            } catch(e) { return errResult('Rate limit check failed'); }
            try { return okResult(JSON.parse(raw)); } catch { return okResult(raw); }
        },
    });
    
    api.registerTool({
        name: 'clawcore_rate_limit_stats',
        label: '📊 ClawCore Rate Stats',
        description: 'Get rate limiter statistics',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.rate_limit import RateLimiter
rl = RateLimiter()
stats = rl.get_stats() if hasattr(rl, 'get_stats') else str(rl)
print(stats)
`;
            let raw;
            try {
                raw = execSync(`python3 -c "${script}"`, {cwd: CORE_CWD, timeout: 15, encoding: 'utf8'}).trim();
            } catch(e) { return errResult('Stats failed'); }
            return okResult(raw);
        },
    });
}