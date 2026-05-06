/**
 * CircuitBreaker Tools - Bridge to Python efficiency_core.circuit_breaker (CircuitBreaker)
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

export function registerCircuitBreakerTools(api) {
  api.registerTool({
    name: 'clawcore_circuit_breaker_call',
    label: '🔧 CircuitBreaker.call',
    description: 'CircuitBreaker.call',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.circuit_breaker import CircuitBreaker; print(str(CircuitBreaker().call()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_circuit_breaker_get_status',
    label: '🔧 CircuitBreaker.get_status',
    description: 'CircuitBreaker.get_status',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.circuit_breaker import CircuitBreaker; print(str(CircuitBreaker().get_status()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_circuit_breaker_reset',
    label: '🔧 CircuitBreaker.reset',
    description: 'CircuitBreaker.reset',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.circuit_breaker import CircuitBreaker; print(str(CircuitBreaker().reset()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
