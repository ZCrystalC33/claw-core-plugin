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
from efficiency_core.health import HealthChecker, get_config

config = get_config()
checker = HealthChecker(config)
results = checker.run_all()
output = checker.to_dict(results)
print(json.dumps(output))
`;
                const raw = runPython(script);
                const data = JSON.parse(raw);
                return okResult(JSON.stringify(data, null, 2), { checks: Object.keys(data).length });
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
            component: Type.String({ description: 'Component: cache, memory, disk, cpu, api' }),
        }),
        async execute(_id, _params) {
            const params = _params;
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.health import HealthChecker, get_config

config = get_config()
checker = HealthChecker(config)
component_map = {
  'cache': 'cache',
  'memory': 'memory',
  'disk': 'disk',
  'cpu': 'cpu',
  'api': 'api'
}
cid = component_map.get('${params.component}', '${params.component}')
result = checker.check_component(cid)
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
from efficiency_core.cache import TwoLevelCache, get_config

config = get_config()
cache = TwoLevelCache.from_config(config)
stats = cache.get_stats()
print(json.dumps(stats))
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
from efficiency_core.health import HealthChecker, get_config
from efficiency_core.metrics import get_metrics
from efficiency_core.cache import TwoLevelCache, get_config

config = get_config()
checker = HealthChecker(config)
health = checker.run_all()

try:
    cache = TwoLevelCache.from_config(config)
    cstats = cache.get_stats()
except:
    cstats = {}

metrics = get_metrics()
try:
    msummary = metrics.summary()
except:
    msummary = {}

print(json.dumps({
    'health': health,
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
