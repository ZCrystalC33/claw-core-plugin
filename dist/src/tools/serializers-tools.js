/**
 * Serializers Tools - Bridge to Python efficiency_core.serializers (SerializerRegistry)
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

export function registerSerializersTools(api) {
  api.registerTool({
    name: 'clawcore_serializers_serialize',
    label: '🔧 Serializers.serialize',
    description: 'SerializerRegistry.serialize',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.serializers import SerializerRegistry; print(str(SerializerRegistry().serialize()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_serializers_deserialize',
    label: '🔧 Serializers.deserialize',
    description: 'SerializerRegistry.deserialize',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.serializers import SerializerRegistry; print(str(SerializerRegistry().deserialize()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
