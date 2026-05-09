// STUB - Decomposer tools
import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';

export function registerDecomposerTools(api) {
    api.registerTool({
        name: 'decomposer_decompose',
        label: 'Decomposer',
        description: 'Decompose task into subtasks',
        parameters: Type.Object({
            task: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[Decomposer] ${params.task} -> subtasks (stub)`);
        },
    });
}