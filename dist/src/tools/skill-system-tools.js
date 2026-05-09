// STUB - Skill system tools
import { Type } from '@sinclair/typebox';
import { okResult } from '../index.js';
export function registerSkillSystemTools(api) {
    api.registerTool({
        name: 'skill_system_status',
        label: 'Skill System Status',
        description: 'Check skill system status',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            return okResult('[SkillSystem] running (stub)');
        },
    });
}
//# sourceMappingURL=skill-system-tools.js.map