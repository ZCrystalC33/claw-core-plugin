// STUB - Middleware tools
import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';

export function registerMiddlewareTools(api) {
    api.registerTool({
        name: 'middleware_register',
        label: 'Middleware Register',
        description: 'Register middleware',
        parameters: Type.Object({
            name: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[Middleware] ${params.name} registered (stub)`);
        },
    });
}