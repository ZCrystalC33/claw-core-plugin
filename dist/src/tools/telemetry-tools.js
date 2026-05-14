import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerTelemetryTools(api) {
    api.registerTool({
        name: 'telemetry_track',
        label: 'Telemetry Track',
        description: 'Track an event',
        parameters: Type.Object({
            event: Type.String(),
            data: Type.Optional(Type.String()),
        }),
        async execute(_id, params) {
            return okResult(`[Telemetry] ${params.event} tracked (stub)`);
        },
    });
}
