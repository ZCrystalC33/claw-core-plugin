// STUB - Circuit breaker tools
import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';

export function registerCircuitBreakerTools(api) {
    api.registerTool({
        name: 'circuit_breaker_status',
        label: 'Circuit Breaker Status',
        description: 'Check circuit breaker state',
        parameters: Type.Object({
            key: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[CircuitBreaker] ${params.key}: CLOSED (stub)`);
        },
    });

    api.registerTool({
        name: 'circuit_breaker_reset',
        label: 'Circuit Breaker Reset',
        description: 'Reset circuit breaker',
        parameters: Type.Object({
            key: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[CircuitBreaker] ${params.key} reset (stub)`);
        },
    });
}