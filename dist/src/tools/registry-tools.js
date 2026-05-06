/**
 * Registry Tools - Bridge to Python efficiency_core.registry (TeamRegistry)
 */
import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPython(script, timeoutMs = 15000) {
    try {
        const result = execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
            encoding: 'utf-8',
            cwd: CORE_CWD,
            timeout: timeoutMs / 1000,
        }).trim();
        return result;
    } catch (e) {
        return null;
    }
}

export function registerRegistryTools(api) {
    // ─── Register Member ──────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_registry_register',
        label: '👤 ClawCore Registry Register',
        description: 'Register an agent member with the TeamRegistry',
        parameters: Type.Object({
            member_id: Type.String({ description: 'Unique member ID' }),
            name: Type.String({ description: 'Member display name' }),
            capabilities: Type.Array(Type.String(), { description: 'List of capabilities' }),
            status: Type.Optional(Type.String({ description: 'Initial status (default: available)' })),
        }),
        async execute(_id, _params) {
            const params = _params;
            const caps = JSON.stringify(params.capabilities || []).replace(/"/g, "'");
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.registry import TeamRegistry

reg = TeamRegistry()
member = reg.register_member('${params.member_id}', '${params.name}', ${caps}, '${params.status || 'available'}')
print(json.dumps({'success': True, 'member': member}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── Unregister Member ────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_registry_unregister',
        label: '🚫 ClawCore Registry Unregister',
        description: 'Unregister a member from the TeamRegistry',
        parameters: Type.Object({
            member_id: Type.String({ description: 'Member ID to remove' }),
        }),
        async execute(_id, _params) {
            const params = _params;
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.registry import TeamRegistry

reg = TeamRegistry()
result = reg.unregister_member('${params.member_id}')
print(json.dumps({'success': result}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── List All Members ─────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_registry_members',
        label: '👥 ClawCore Registry Members',
        description: 'List all registered members in the TeamRegistry',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.registry import TeamRegistry

reg = TeamRegistry()
members = reg.get_all_members()
print(json.dumps({'count': len(members), 'members': members}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── Get Available Members ────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_registry_available',
        label: '✅ ClawCore Registry Available',
        description: 'List available (idle) members',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.registry import TeamRegistry

reg = TeamRegistry()
members = reg.get_available_members()
print(json.dumps({'count': len(members), 'members': members}))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── Get Load Stats ───────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_registry_load',
        label: '📈 ClawCore Registry Load',
        description: 'Get workload distribution stats across members',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.registry import TeamRegistry

reg = TeamRegistry()
stats = reg.get_load_stats()
print(json.dumps(stats))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });

    // ─── Get Recommendation ──────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_registry_recommend',
        label: '🎯 ClawCore Registry Recommend',
        description: 'Get recommended member for a task',
        parameters: Type.Object({
            required_capability: Type.String({ description: 'Required capability' }),
        }),
        async execute(_id, _params) {
            const params = _params;
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.registry import TeamRegistry

reg = TeamRegistry()
rec = reg.get_recommendation('${params.required_capability}')
print(json.dumps(rec))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult(raw);
        },
    });
}