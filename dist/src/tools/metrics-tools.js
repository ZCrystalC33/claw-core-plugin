/**
 * Metrics Tools - Bridge to Python efficiency_core.metrics
 */
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
export function registerMetricsTools(api) {
    // ─── Metrics Summary ─────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_metrics',
        label: '📈 ClawCore Metrics',
        description: 'Get system metrics summary',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.metrics import get_metrics

m = get_metrics()
summary = m.summary()
print(json.dumps(summary, default=str))
`;
                const raw = runPython(script);
                return okResult(raw);
            }
            catch (e) {
                return errResult(`Metrics failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    // ─── Record Decompose ────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_record_decompose',
        label: '📝 Record Decompose',
        description: 'Record a decomposition operation',
        parameters: Type.Object({
            task: Type.String(),
            subtasks: Type.Number(),
            durationMs: Type.Number(),
            success: Type.Boolean(),
        }),
        async execute(_id, _params) {
            const params = _params;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = params;
            try {
                const script = `
import sys
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.metrics import record_decompose

record_decompose(
    task='${params.task.replace(/'/g, "\\'")}',
    subtasks=${params.subtasks},
    duration_ms=${params.durationMs},
    success=${params.success}
)
print(json.dumps({'ok': True}))
`;
                runPython(script);
                return okResult('Decompose recorded');
            }
            catch (e) {
                return errResult(`Record failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    // ─── Record Integration ─────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_record_integration',
        label: '📝 Record Integration',
        description: 'Record an integration operation',
        parameters: Type.Object({
            agentCount: Type.Number(),
            durationMs: Type.Number(),
            success: Type.Boolean(),
        }),
        async execute(_id, _params) {
            const params = _params;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = params;
            try {
                const script = `
import sys
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.metrics import record_integration

record_integration(
    agent_count=${params.agentCount},
    duration_ms=${params.durationMs},
    success=${params.success}
)
print(json.dumps({'ok': True}))
`;
                runPython(script);
                return okResult('Integration recorded');
            }
            catch (e) {
                return errResult(`Record failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    // ─── Timed Operation ─────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_timed',
        label: '⏱️ ClawCore Timed',
        description: 'Wrap an operation with timing',
        parameters: Type.Object({
            operation: Type.String(),
            task: Type.String(),
        }),
        async execute(_id, _params) {
            const params = _params;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = params;
            try {
                const script = `
import sys
import json
import time
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.metrics import timed

@timed('${params.operation}')
def wrapped_task():
    return '${params.task.replace(/'/g, "\\'")}'

result = wrapped_task()
print(json.dumps({'result': result, 'operation': '${params.operation}'}))
`;
                const raw = runPython(script);
                return okResult(raw);
            }
            catch (e) {
                return errResult(`Timed failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    // ─── Reset Metrics ───────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_metrics_reset',
        label: '🔄 Reset Metrics',
        description: 'Reset all metrics counters',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            try {
                const script = `
import sys
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.metrics import MetricsCollector

mc = MetricsCollector()
mc.reset()
print(json.dumps({'ok': True}))
`;
                runPython(script);
                return okResult('Metrics reset');
            }
            catch (e) {
                return errResult(`Reset failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
}
//# sourceMappingURL=metrics-tools.js.map