// STUB - Error classifier tools
import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerErrorClassifierTools(api) {
    api.registerTool({
        name: 'error_classify',
        label: 'Error Classify',
        description: 'Classify an error',
        parameters: Type.Object({
            error: Type.String(),
        }),
        async execute(_id, params) {
            return okResult(`[ErrorClassifier] ${params.error} -> UNKNOWN (stub)`);
        },
    });
}
//# sourceMappingURL=error-classifier-tools.js.map