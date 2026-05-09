// STUB - Events tools
import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerEventsTools(api) {
    api.registerTool({
        name: 'events_emit',
        label: 'Events Emit',
        description: 'Emit an event',
        parameters: Type.Object({
            name: Type.String(),
            data: Type.Optional(Type.String()),
        }),
        async execute(_id, params) {
            return okResult(`[Events] ${params.name} emitted (stub)`);
        },
    });
}
//# sourceMappingURL=events-tools.js.map