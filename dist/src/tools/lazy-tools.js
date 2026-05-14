import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerLazyTools(api) {
    api.registerTool({
        name: 'lazy_resolve',
        label: 'Lazy Resolve',
        description: 'Resolve lazy-loaded value',
        parameters: Type.Object({
            key: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[Lazy] ${params.key}=null (stub)`);
        },
    });
}
