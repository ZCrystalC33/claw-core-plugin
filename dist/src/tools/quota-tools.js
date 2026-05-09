// STUB - Quota tools
import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerQuotaTools(api) {
    api.registerTool({
        name: 'quota_check',
        label: 'Quota Check',
        description: 'Check quota usage',
        parameters: Type.Object({
            key: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[Quota] ${params.key}: 0/100 (stub)`);
        },
    });
}
//# sourceMappingURL=quota-tools.js.map