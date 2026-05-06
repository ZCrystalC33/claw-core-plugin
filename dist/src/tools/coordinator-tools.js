/**
 * Coordinator Tools - Bridge to Python efficiency_core Coordinator
 */
import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPython(script) {
    try {
        return execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
            cwd: CORE_CWD,
            timeout: 15,
            encoding: 'utf8',
        }).trim();
    } catch (e) {
        return null;
    }
}

export function registerCoordinatorTools(api) {
    api.registerTool({
        name: 'clawcore_coordinator_status',
        label: '🎯 ClawCore Coordinator Status',
        description: 'Get coordinator status and statistics',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.coordinator import Coordinator
c = Coordinator()
stats = c.get_stats()
print(str(stats) if stats else 'no_stats')
`;
            const raw = runPython(script);
            return okResult(raw || 'no_stats');
        },
    });

    api.registerTool({
        name: 'clawcore_coordinator_process',
        label: '⚙️ ClawCore Coordinator Process',
        description: 'Process a task through the coordinator',
        parameters: Type.Object({
            task: Type.String({ description: 'Task description to process' }),
        }),
        async execute(_id, _params) {
            const params = _params;
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.coordinator import Coordinator
c = Coordinator()
result = c.process('${params.task.replace(/'/g, "\\'")}')
print(str(result) if result else 'processed')
`;
            const raw = runPython(script);
            return okResult(raw || 'processed');
        },
    });
}
