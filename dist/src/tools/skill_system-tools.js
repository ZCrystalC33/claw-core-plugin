/**
 * SkillSystem Tools - Bridge to Python efficiency_core.skill_system (SkillRegistry)
 */
import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPython(script) {
  try {
    return execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8', cwd: CORE_CWD, timeout: 15000,
    }).trim();
  } catch (e) { return null; }
}

export function registerSkillSystemTools(api) {
  api.registerTool({
    name: 'clawcore_skill_system_list_skills',
    label: '🔧 SkillSystem.list_skills',
    description: 'SkillRegistry.list_skills',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.skill_system import SkillRegistry; print(str(SkillRegistry().list_skills()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_skill_system_get_skill',
    label: '🔧 SkillSystem.get_skill',
    description: 'SkillRegistry.get_skill',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.skill_system import SkillRegistry; print(str(SkillRegistry().get_skill()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
  api.registerTool({
    name: 'clawcore_skill_system_register',
    label: '🔧 SkillSystem.register',
    description: 'SkillRegistry.register',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const script = `import sys; sys.path.insert(0, '/home/snow/.openclaw/workspace/openclaw-efficiency-core/src'); from efficiency_core.skill_system import SkillRegistry; print(str(SkillRegistry().register()))`;
      const raw = runPython(script);
      return okResult(raw || 'ok');
    },
  });
}
