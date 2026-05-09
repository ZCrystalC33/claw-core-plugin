// STUB - Lock tools
import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';

export function registerLockTools(api) {
    api.registerTool({
        name: 'lock_acquire',
        label: 'Lock Acquire',
        description: 'Acquire a lock',
        parameters: Type.Object({
            key: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[Lock] ${params.key} acquired (stub)`);
        },
    });

    api.registerTool({
        name: 'lock_release',
        label: 'Lock Release',
        description: 'Release a lock',
        parameters: Type.Object({
            key: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[Lock] ${params.key} released (stub)`);
        },
    });
}