/**
 * Middleware Tools - Bridge to Python efficiency_core.middleware (MiddlewareChain)
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

export function registerMiddlewareTools(api) {
    // ─── Add Middleware ───────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_middleware_add',
        label: '🔧 ClawCore Middleware Add',
        description: 'Add a middleware function to the MiddlewareChain',
        parameters: Type.Object({
            name: Type.String({ description: 'Middleware name' }),
            func: Type.String({ description: 'Function body (lambda or def)' }),
        }),
        async execute(_id, _params) {
            const params = _params as any;
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.middleware import MiddlewareChain

chain = MiddlewareChain()
try:
    mw = eval(${params.func ? `'${params.func.replace(/'/g, "\\'")}'` : 'None'})
    chain.add(mw)
    print(json.dumps({'success': True, 'name': '${params.name}', 'count': len(chain.middlewares) if hasattr(chain, "middlewares") else 0}))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── List Active Middleware ───────────────────────────────────────
    api.registerTool({
        name: 'clawcore_middleware_list',
        label: '📜 ClawCore Middleware List',
        description: 'List all active middleware in the chain',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.middleware import MiddlewareChain

chain = MiddlewareChain()
mws = chain.middlewares if hasattr(chain, 'middlewares') else []
names = [getattr(m, '__name__', repr(m)) for m in mws]
print(json.dumps({'count': len(names), 'middlewares': names}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── Get Middleware Stats ─────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_middleware_stats',
        label: '📊 ClawCore Middleware Stats',
        description: 'Get middleware chain statistics',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.middleware import MiddlewareChain

chain = MiddlewareChain()
mws = chain.middlewares if hasattr(chain, 'middlewares') else []
stats = {
    'count': len(mws),
    'names': [getattr(m, '__name__', repr(m)) for m in mws],
}
try:
    if hasattr(chain, 'get_stats'):
        extra = chain.get_stats()
        stats.update(extra)
except:
    pass
print(json.dumps(stats))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });
}