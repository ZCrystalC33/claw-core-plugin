import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerRetryTools(api) {
    api.registerTool({
        name: 'retry_execute',
        label: 'Retry Execute',
        description: 'Execute with retry logic',
        parameters: Type.Object({
            fn: Type.String(),
            attempts: Type.Optional(Type.Number()),
        }),
        async execute(_id, params) {
            return okResult(`[Retry] ${params.fn} (${params.attempts || 3} attempts) (stub)`);
        },
    });
}
