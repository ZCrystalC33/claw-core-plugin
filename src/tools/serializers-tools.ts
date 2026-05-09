// STUB - Serializers tools
import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';

export function registerSerializersTools(api) {
    api.registerTool({
        name: 'serializers_serialize',
        label: 'Serialize',
        description: 'Serialize data',
        parameters: Type.Object({
            data: Type.String(),
            format: Type.Optional(Type.String()),
        }),
        async execute(_id, params) {
            return okResult(`[Serializers] ${params.data.slice(0, 20)}... serialized (stub)`);
        },
    });

    api.registerTool({
        name: 'serializers_deserialize',
        label: 'Deserialize',
        description: 'Deserialize data',
        parameters: Type.Object({
            data: Type.String(),
            format: Type.Optional(Type.String()),
        }),
        async execute(_id, params) {
            return okResult(`[Serializers] ${params.data.slice(0, 20)}... deserialized (stub)`);
        },
    });
}