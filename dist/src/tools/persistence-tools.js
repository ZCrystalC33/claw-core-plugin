// STUB - Persistence tools
import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerPersistenceTools(api) {
    api.registerTool({
        name: 'persistence_save',
        label: 'Persistence Save',
        description: 'Save data to persistence',
        parameters: Type.Object({
            key: Type.String(),
            value: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[Persistence] ${params.key} saved (stub)`);
        },
    });
    api.registerTool({
        name: 'persistence_load',
        label: 'Persistence Load',
        description: 'Load data from persistence',
        parameters: Type.Object({
            key: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[Persistence] ${params.key}=null (stub)`);
        },
    });
}
//# sourceMappingURL=persistence-tools.js.map