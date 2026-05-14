import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerQueueTools(api) {
    api.registerTool({
        name: 'queue_enqueue',
        label: 'Queue Enqueue',
        description: 'Add item to queue',
        parameters: Type.Object({
            item: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[Queue] ${params.item} enqueued (stub)`);
        },
    });
    api.registerTool({
        name: 'queue_dequeue',
        label: 'Queue Dequeue',
        description: 'Remove item from queue',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            return okResult('[Queue] dequeued null (stub)');
        },
    });
}
