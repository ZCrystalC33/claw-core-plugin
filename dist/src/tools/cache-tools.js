import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerCacheTools(api) {
    api.registerTool({
        name: 'cache_get',
        label: 'Cache Get',
        description: 'Get value from cache',
        parameters: Type.Object({
            key: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[Cache] ${params.key}=null (stub)`);
        },
    });
    api.registerTool({
        name: 'cache_set',
        label: 'Cache Set',
        description: 'Set value in cache',
        parameters: Type.Object({
            key: Type.String(),
            value: Type.String(),
            ttl: Type.Optional(Type.Number()),
        }),
        async execute(_id, params) {
            return okResult(`[Cache] ${params.key} set (stub)`);
        },
    });
}
