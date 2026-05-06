/**
 * Circuit Breaker Tools - Bridge to Python efficiency_core.circuit_breaker
 */

import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPython(script, timeoutMs = 15000) {
  try {
    const result = execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
      cwd: CORE_CWD,
      timeout: timeoutMs / 1000,
      encoding: 'utf8',
    });
    return result.trim();
  } catch (e) {
    return null;
  }
}

export function registerCircuitBreakerTools(api) {
  // ─── Circuit Breaker Status ──────────────────────────────────────────
  api.registerTool({
    name: 'clawcore_circuit_status',
    label: '🔧 ClawCore Circuit Breaker Status',
    description: 'Get current circuit breaker state, health score, and stats',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.circuit_breaker import CircuitBreaker
import json

cb = CircuitBreaker()
status = {
    'state': cb.state(),
    'stats': cb.stats(),
    'health_score': cb.get_health_score(),
    'is_available': cb.is_available()
}
print(json.dumps(status))
`;
      const raw = runPython(script);
      if (!raw) return errResult('Circuit breaker status check failed');
      try {
        const data = JSON.parse(raw);
        return okResult(
          `Circuit Breaker State: ${data.state}\n` +
          `Health Score: ${data.health_score}\n` +
          `Available: ${data.is_available}\n` +
          `Stats: ${JSON.stringify(data.stats)}`
        );
      } catch {
        return okResult(raw);
      }
    },
  });

  // ─── Circuit Breaker Record Success ──────────────────────────────────
  api.registerTool({
    name: 'clawcore_circuit_success',
    label: '✅ ClawCore Circuit Breaker Record Success',
    description: 'Record a successful operation on the circuit breaker',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.circuit_breaker import CircuitBreaker
import json

cb = CircuitBreaker()
cb.record_success()
print(json.dumps({'state': cb.state(), 'stats': cb.stats()}))
`;
      const raw = runPython(script);
      if (!raw) return errResult('Failed to record success');
      return okResult(`Success recorded. State: ${raw}`);
    },
  });

  // ─── Circuit Breaker Record Failure ─────────────────────────────────
  api.registerTool({
    name: 'clawcore_circuit_failure',
    label: '❌ ClawCore Circuit Breaker Record Failure',
    description: 'Record a failed operation on the circuit breaker',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.circuit_breaker import CircuitBreaker
import json

cb = CircuitBreaker()
cb.record_failure()
print(json.dumps({'state': cb.state(), 'stats': cb.stats()}))
`;
      const raw = runPython(script);
      if (!raw) return errResult('Failed to record failure');
      return okResult(`Failure recorded. State: ${raw}`);
    },
  });

  // ─── Circuit Breaker Can Execute ─────────────────────────────────────
  api.registerTool({
    name: 'clawcore_circuit_can_execute',
    label: '🔎 ClawCore Circuit Breaker Can Execute',
    description: 'Check if an operation can be executed through the circuit breaker',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.circuit_breaker import CircuitBreaker

cb = CircuitBreaker()
can_exec = cb.can_execute()
print('true' if can_exec else 'false')
`;
      const raw = runPython(script);
      if (!raw) return errResult('Circuit breaker check failed');
      const canExecute = raw === 'true';
      return okResult(
        canExecute
          ? '✅ Circuit breaker allows execution'
          : '🚫 Circuit breaker is OPEN — operation blocked'
      );
    },
  });

  // ─── Circuit Breaker Reset ──────────────────────────────────────────
  api.registerTool({
    name: 'clawcore_circuit_reset',
    label: '🔄 ClawCore Circuit Breaker Reset',
    description: 'Reset circuit breaker to CLOSED state',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.circuit_breaker import CircuitBreaker

cb = CircuitBreaker()
cb.reset()
print(cb.state())
`;
      const raw = runPython(script);
      if (!raw) return errResult('Failed to reset circuit breaker');
      return okResult(`Circuit breaker reset to: ${raw}`);
    },
  });

  // ─── Circuit Breaker Create ──────────────────────────────────────────
  api.registerTool({
    name: 'clawcore_circuit_create',
    label: '🆕 ClawCore Circuit Breaker Create',
    description: 'Create a new circuit breaker with custom parameters',
    parameters: Type.Object({
      name: Type.String({ description: 'Circuit breaker name' }),
      failure_threshold: Type.Optional(Type.Number({ description: 'Failures before opening (default: 5)' })),
      recovery_timeout: Type.Optional(Type.Number({ description: 'Seconds before half-open (default: 60)' })),
      half_open_max_calls: Type.Optional(Type.Number({ description: 'Max calls in half-open (default: 3)' })),
    }),
    async execute(_id, _params) {
      const params = _params;
      const name = params.name || 'default';
      const ft = params.failure_threshold || 5;
      const rt = params.recovery_timeout || 60;
      const hm = params.half_open_max_calls || 3;
      const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.circuit_breaker import CircuitBreaker
import json

cb = CircuitBreaker(name='${name}', failure_threshold=${ft}, recovery_timeout=${rt}, half_open_max_calls=${hm})
print(json.dumps({'name': cb.state(), 'state': cb.state()}))
`;
      const raw = runPython(script);
      if (!raw) return errResult('Failed to create circuit breaker');
      return okResult(`Circuit breaker '${name}' created with state: ${raw}`);
    },
  });
}