/**
 * Skill System Tools - Bridge to Python efficiency_core.skill_system
 */
import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPython(script) {
    try {
        return execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
            encoding: 'utf-8',
            cwd: CORE_CWD,
            timeout: 15000,
        }).trim();
    } catch (e) {
        return null;
    }
}

export function registerSkillSystemTools(api) {
    // ─── List All Skills ─────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_skill_list',
        label: '🛠️ ClawCore Skill List',
        description: 'List all registered skills in the system',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.skill_system import SkillRegistry

registry = SkillRegistry()
skills = registry.list_all()
result = []
for skill in skills:
    result.append({
        'name': skill.name,
        'slug': skill.slug,
        'type': skill.type,
        'description': skill.description
    })
print(json.dumps(result))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            try {
                return okResult(raw);
            } catch {
                return errResult('Parse error');
            }
        },
    });

    // ─── List Command Skills ────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_skill_list_commands',
        label: '📦 ClawCore Skill List Commands',
        description: 'List all command-type skills',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.skill_system import SkillRegistry

registry = SkillRegistry()
skills = registry.list_commands()
result = []
for skill in skills:
    result.append({
        'name': skill.name,
        'slug': skill.slug,
        'description': skill.description
    })
print(json.dumps(result))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            try {
                return okResult(raw);
            } catch {
                return errResult('Parse error');
            }
        },
    });

    // ─── Get Skill by Name ───────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_skill_get',
        label: '🔍 ClawCore Skill Get',
        description: 'Get skill details by name or slug',
        parameters: Type.Object({
            name: Type.String({ description: 'Skill name or slug to look up' }),
        }),
        async execute(_id, _params) {
            const p = _params;
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.skill_system import SkillRegistry

registry = SkillRegistry()
skill = registry.get('${p.name}')
if skill:
    print(json.dumps({
        'name': skill.name,
        'slug': skill.slug,
        'type': skill.type,
        'description': skill.description
    }))
else:
    print('null')
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            if (raw === 'null') return errResult('Skill not found');
            try {
                return okResult(raw);
            } catch {
                return errResult('Parse error');
            }
        },
    });

    // ─── Execute Command Skill ──────────────────────────────────────
    api.registerTool({
        name: 'clawcore_skill_execute',
        label: '⚡ ClawCore Skill Execute',
        description: 'Execute a command skill by name with arguments',
        parameters: Type.Object({
            name: Type.String({ description: 'Command skill name to execute' }),
            args: Type.Optional(Type.String({ description: 'JSON arguments string' })),
        }),
        async execute(_id, _params) {
            const p = _params;
            const args = p.args || '{}';
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.skill_system import SkillRegistry

registry = SkillRegistry()
try:
    args_dict = json.loads('${args}')
    result = registry.execute_command('${p.name}', **args_dict)
    if isinstance(result, str):
        print(result)
    else:
        print(json.dumps(result, default=str))
except Exception as e:
    print(f'ERROR: {str(e)}')
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            if (raw.startsWith('ERROR:')) return errResult(raw.slice(7));
            try {
                return okResult(raw);
            } catch {
                return okResult(raw);
            }
        },
    });

    // ─── Discover Skills ─────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_skill_discover',
        label: '🔎 ClawCore Skill Discover',
        description: 'Discover skills from a directory',
        parameters: Type.Object({
            path: Type.Optional(Type.String({ description: 'Directory path to scan (default: built-in)' })),
        }),
        async execute(_id, _params) {
            const p = _params;
            const script = `
import sys
import json
from pathlib import Path
sys.path.insert(0, '${CORE_CWD}')

if '${p.path}':
    from efficiency_core.skill_system import discover_skills
    discovered = discover_skills(Path('${p.path}'))
    print(json.dumps(discovered))
else:
    from efficiency_core.skill_system import register_builtin_skills
    register_builtin_skills()
    print('builtin_skills_registered')
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(JSON.stringify({ result: raw }));
        },
    });
}