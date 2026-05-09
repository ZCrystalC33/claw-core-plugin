// STUB - Credential pool tools
import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerCredentialPoolTools(api) {
    api.registerTool({
        name: 'credential_pool_get',
        label: 'Credential Pool Get',
        description: 'Get credential from pool',
        parameters: Type.Object({
            key: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[CredentialPool] ${params.key}=*** (stub)`);
        },
    });
}
//# sourceMappingURL=credential-pool-tools.js.map