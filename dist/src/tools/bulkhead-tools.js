// STUB - Bulkhead tools (concurrency limiting)
import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerBulkheadTools(api) {
    api.registerTool({
        name: 'bulkhead_limit',
        label: 'Bulkhead Limit',
        description: 'Check/set concurrency limits for bulkhead isolation',
        parameters: Type.Object({
            action: Type.String(),
            key: Type.String(),
            limit: Type.Optional(Type.Number()),
        }),
        async execute(_id, params) {
            if (params.action === 'get') {
                return okResult(`[Bulkhead] ${params.key}: limit=10 (stub)`);
            }
            return okResult(`[Bulkhead] ${params.key} limit set to ${params.limit} (stub)`);
        },
    });
}
//# sourceMappingURL=bulkhead-tools.js.map