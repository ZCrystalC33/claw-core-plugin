import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';
const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';
function runPython(script) {
    return execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
        cwd: CORE_CWD,
        timeout: 15000,
    }).trim();
}
export function registerHealthTools(api) {
    api.registerTool({
        name: 'clawcore_health',
        label: '🔍 ClawCore Health',
        description: 'Run all health checks on Claw_Core system',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.health import get_health_checker

checker = get_health_checker()
health = checker.run_all()

def serialize_health(health):
    return {
        'overall': health.overall.value if hasattr(health.overall, 'value') else str(health.overall),
        'uptime_seconds': health.uptime_seconds,
        'components': [
            {
                'name': c.name,
                'status': c.status.value if hasattr(c.status, 'value') else str(c.status),
                'latency_ms': getattr(c, 'latency_ms', 0),
                'message': getattr(c, 'message', ''),
            }
            for c in health.components
        ]
    }

print(json.dumps(serialize_health(health)))
`;
                const raw = runPython(script);
                const data = JSON.parse(raw);
                return okResult(JSON.stringify(data, null, 2), { checks: data.components.length });
            }
            catch (e) {
                return errResult(`Health check failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'clawcore_health_component',
        label: '🔍 ClawCore Component Health',
        description: 'Check health of a specific component',
        parameters: Type.Object({
            component: Type.String({ description: 'Component: cpu, memory, disk, cache, metrics' }),
        }),
        async execute(_id, _params) {
            const params = _params;
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.health import get_health_checker

checker = get_health_checker()
health = checker.run_all()

cid = '${params.component}'
for c in health.components:
    if c.name == cid:
        result = {
            'name': c.name,
            'status': c.status.value if hasattr(c.status, 'value') else str(c.status),
            'latency_ms': getattr(c, 'latency_ms', 0),
            'message': getattr(c, 'message', ''),
        }
        break
else:
    result = {'name': cid, 'status': 'unknown', 'message': 'not found'}

print(json.dumps(result))
`;
                const raw = runPython(script);
                return okResult(raw);
            }
            catch (e) {
                return errResult(`Component check failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'clawcore_health_cache',
        label: '💾 ClawCore Cache Health',
        description: 'Check TwoLevelCache health and stats',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.cache import TwoLevelCache

try:
    cache = TwoLevelCache()
    stats = cache.get_stats()
    print(json.dumps(stats, default=str))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;
                const raw = runPython(script);
                const stats = JSON.parse(raw);
                return okResult(JSON.stringify(stats, null, 2));
            }
            catch (e) {
                return errResult(`Cache health failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'clawcore_status',
        label: '📊 ClawCore Status',
        description: 'Quick system status overview',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.health import get_health_checker
from efficiency_core.metrics import get_metrics

health_checker = get_health_checker()
health = health_checker.run_all()

try:
    from efficiency_core.cache import TwoLevelCache
    cache = TwoLevelCache()
    cstats = cache.get_stats()
except:
    cstats = {'error': 'cache unavailable'}

metrics = get_metrics()
msummary = metrics.summary()

def serialize_health(h):
    return {
        'overall': h.overall.value if hasattr(h.overall, 'value') else str(h.overall),
        'uptime_seconds': h.uptime_seconds,
        'components': [
            {'name': c.name, 'status': c.status.value if hasattr(c.status, 'value') else str(c.status)}
            for c in h.components
        ]
    }

print(json.dumps({
    'health': serialize_health(health),
    'cache': cstats,
    'metrics': msummary
}, default=str))
`;
                const raw = runPython(script);
                return okResult(raw);
            }
            catch (e) {
                return errResult(`Status check failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
}
