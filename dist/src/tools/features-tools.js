// STUB - Features tools
import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerFeaturesTools(api) {
    api.registerTool({
        name: 'features_list',
        label: 'Features List',
        description: 'List available features',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            return okResult('[Features] stub features (stub)');
        },
    });
}
//# sourceMappingURL=features-tools.js.map