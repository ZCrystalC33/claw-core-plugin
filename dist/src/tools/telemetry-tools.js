/**
 * Telemetry Tools - Bridge to Python efficiency_core.telemetry (TelemetryCollector)
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

export function registerTelemetryTools(api) {
  api.registerTool({
    name: 'clawcore_telemetry_record',
    label: '🔧 Telemetry.record',
    description: 'TelemetryCollector.record',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.telemetry import TelemetryCollector; print(str(TelemetryCollector().record()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_telemetry_get_metrics',
    label: '🔧 Telemetry.get_metrics',
    description: 'TelemetryCollector.get_metrics',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.telemetry import TelemetryCollector; print(str(TelemetryCollector().get_metrics()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_telemetry_export_traces',
    label: '🔧 Telemetry.export_traces',
    description: 'TelemetryCollector.export_traces',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.telemetry import TelemetryCollector; print(str(TelemetryCollector().export_traces()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
