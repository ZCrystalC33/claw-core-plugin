/**
 * Events Tools - Bridge to Python efficiency_core.events (EventBus)
 */
import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPython(script) {
  try {
    return execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8', cwd: CORE_CWD, timeout: 15000,
    }).trim();
  } catch (e) { return null; }
}

export function registerEventsTools(api) {
  api.registerTool({
    name: 'clawcore_events_publish',
    label: '🔧 Events.publish',
    description: 'EventBus.publish',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.events import EventBus; print(str(EventBus().publish()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_events_subscribe',
    label: '🔧 Events.subscribe',
    description: 'EventBus.subscribe',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.events import EventBus; print(str(EventBus().subscribe()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_events_get_topics',
    label: '🔧 Events.get_topics',
    description: 'EventBus.get_topics',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.events import EventBus; print(str(EventBus().get_topics()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
