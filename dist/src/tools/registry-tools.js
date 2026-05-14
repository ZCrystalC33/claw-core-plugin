import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerRegistryTools(api) {
    api.registerTool({
        name: 'registry_register',
        label: 'Registry Register',
        description: 'Register a tool/service',
        parameters: Type.Object({
            name: Type.String(),
            service: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[Registry] ${params.name} -> ${params.service} (stub)`);
        },
    });
    api.registerTool({
        name: 'registry_resolve',
        label: 'Registry Resolve',
        description: 'Resolve a registered service',
        parameters: Type.Object({
            name: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[Registry] ${params.name}=null (stub)`);
        },
    });
}
