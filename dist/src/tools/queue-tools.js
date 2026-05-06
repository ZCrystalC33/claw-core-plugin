/**
 * Queue Tools - Bridge to Python efficiency_core.queue (MessageQueue)
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

export function registerQueueTools(api) {
  api.registerTool({
    name: 'clawcore_queue_put',
    label: '🔧 Queue.put',
    description: 'MessageQueue.put',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.queue import MessageQueue; print(str(MessageQueue().put()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_queue_get',
    label: '🔧 Queue.get',
    description: 'MessageQueue.get',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.queue import MessageQueue; print(str(MessageQueue().get()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_queue_size',
    label: '🔧 Queue.size',
    description: 'MessageQueue.size',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.queue import MessageQueue; print(str(MessageQueue().size()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
