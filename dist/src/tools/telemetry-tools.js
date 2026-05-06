/**
 * Telemetry Tools - Bridge to Python efficiency_core.telemetry (Tracer / Trace)
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

export function registerTelemetryTools(api) {
    // ─── Record Telemetry Event ──────────────────────────────────────
    api.registerTool({
        name: 'clawcore_telemetry_record',
        label: '📝 ClawCore Telemetry Record',
        description: 'Record a custom telemetry event via the tracer',
        parameters: Type.Object({
            event_name: Type.String({ description: 'Name of the event to record' }),
            duration_ms: Type.Optional(Type.Number({ description: 'Event duration in ms' })),
            metadata: Type.Optional(Type.String({ description: 'JSON metadata string' })),
        }),
        async execute(_id, _params) {
            const params = _params;
            const metadata = params.metadata ? `'${params.metadata.replace(/'/g, "\\'")}'` : '{}';
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.telemetry import get_tracer

tracer = get_tracer()
span = tracer.start_span('${params.event_name}')
if ${params.duration_ms || 0} > 0:
    import time
    time.sleep(${(params.duration_ms || 0) / 1000.0})
tracer.finish_span(span)
print(json.dumps({'success': True, 'trace_id': span.trace_id if hasattr(span, 'trace_id') else 'unknown'}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── Get Telemetry Metrics ────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_telemetry_metrics',
        label: '📊 ClawCore Telemetry Metrics',
        description: 'Get current telemetry metrics and statistics',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.telemetry import get_tracer

tracer = get_tracer()
try:
    stats = tracer.get_stats()
    print(json.dumps(stats))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── Export Traces ───────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_telemetry_export',
        label: '📤 ClawCore Telemetry Export',
        description: 'Export recent traces as JSON',
        parameters: Type.Object({
            limit: Type.Optional(Type.Number({ description: 'Max traces to export (default: 50)' })),
        }),
        async execute(_id, _params) {
            const params = _params;
            const limit = params.limit || 50;
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.telemetry import get_tracer

tracer = get_tracer()
try:
    traces = tracer.get_recent_traces(${limit})
    if traces:
        result = []
        for t in traces:
            d = {}
            if hasattr(t, 'trace_id'): d['trace_id'] = t.trace_id
            if hasattr(t, 'duration_ms'): d['duration_ms'] = t.duration_ms
            result.append(d)
        print(json.dumps({'count': len(result), 'traces': result}))
    else:
        print(json.dumps({'count': 0, 'traces': []}))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── Get Tracer Info ─────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_telemetry_info',
        label: 'ℹ️ ClawCore Telemetry Info',
        description: 'Get tracer service name and status',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.telemetry import get_tracer

tracer = get_tracer()
print(json.dumps({
    'service_name': tracer.service_name() if hasattr(tracer, 'service_name') else 'unknown',
    'max_traces': tracer.MAX_TRACES if hasattr(tracer, 'MAX_TRACES') else 'unknown',
}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── Clear Traces ───────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_telemetry_clear',
        label: '🗑 ClawCore Telemetry Clear',
        description: 'Clear all stored traces from the tracer',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.telemetry import get_tracer

tracer = get_tracer()
tracer.clear()
print('traces cleared')
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult('Telemetry traces cleared');
        },
    });
}