/**
 * Events Tools - Bridge to Python efficiency_core.events (EventBus)
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

export function registerEventsTools(api) {
    // ─── Publish Event ─────────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_event_publish',
        label: '📡 ClawCore Event Publish',
        description: 'Publish an event to the EventBus',
        parameters: Type.Object({
            event_type: Type.String({ description: 'Event type (e.g. tool.called, task.completed)' }),
            data: Type.Optional(Type.String({ description: 'Event payload as JSON string' })),
        }),
        async execute(_id, _params) {
            const params = _params as any;
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.events import EventBus

bus = EventBus.get_instance()
event_payload = ${params.data ? `'${params.data.replace(/'/g, "\\'")}'` : 'None'}
result = bus.publish('${params.event_type}', event_payload)
print(json.dumps({'success': True, 'published': result}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            try { return okResult(raw); }
            catch (e) { return errResult('Failed to parse result: ' + raw); }
        },
    });

    // ─── Subscribe to Events ───────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_event_subscribe',
        label: '🔔 ClawCore Event Subscribe',
        description: 'Subscribe to an event type on the EventBus',
        parameters: Type.Object({
            event_type: Type.String({ description: 'Event type to subscribe to' }),
            handler_id: Type.String({ description: 'Unique handler identifier' }),
        }),
        async execute(_id, _params) {
            const params = _params as any;
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.events import EventBus

bus = EventBus.get_instance()
bus.subscribe('${params.event_type}', lambda e: print(f"handler:${params.handler_id} triggered"))
print(json.dumps({'success': True, 'subscribed': '${params.event_type}', 'handler': '${params.handler_id}'}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── List Recent Events ───────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_event_list',
        label: '📋 ClawCore Event List',
        description: 'List recent events from the EventBus',
        parameters: Type.Object({
            limit: Type.Optional(Type.Number({ description: 'Max events to return (default 20)' })),
        }),
        async execute(_id, _params) {
            const params = _params as any;
            const limit = params.limit || 20;
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.events import EventBus

bus = EventBus.get_instance()
events = bus.get_events() if hasattr(bus, 'get_events') else []
print(json.dumps({'events': events[-${limit}:]} if events else {'events': []}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── Clear EventBus ───────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_event_clear',
        label: '🗑 ClawCore Event Clear',
        description: 'Clear all events from the EventBus',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.events import EventBus

bus = EventBus.get_instance()
bus.clear()
print('cleared')
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult('EventBus cleared');
        },
    });
}