/**
 * WorkerPool Tools - Bridge to Python efficiency_core WorkerPool
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

export function registerWorkerpoolTools(api) {
    api.registerTool({
        name: 'clawcore_workerpool_stats',
        label: '👷 ClawCore WorkerPool Stats',
        description: 'Get worker pool statistics',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.workerpool import WorkerPool
wp = WorkerPool()
stats = wp.get_all_stats()
print(f"size={wp.size}, active={wp.active_count}, stats={stats}")
`;
            const raw = runPython(script);
            return okResult(raw || 'no_stats');
        },
    });

    api.registerTool({
        name: 'clawcore_workerpool_submit',
        label: '📦 ClawCore WorkerPool Submit',
        description: 'Submit a task to the worker pool',
        parameters: Type.Object({
            task_id: Type.String({ description: 'Unique task ID' }),
            task: Type.String({ description: 'Task description' }),
        }),
        async execute(_id, _params) {
            const params = _params;
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.workerpool import WorkerPool
wp = WorkerPool()
wp.submit('${params.task_id}', '${params.task.replace(/'/g, "\\'")}')
print('submitted')
`;
            const raw = runPython(script);
            return okResult(raw || 'submitted');
        },
    });

    api.registerTool({
        name: 'clawcore_workerpool_status',
        label: '🔍 ClawCore WorkerPool Status',
        description: 'Get worker pool size and active count',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.workerpool import WorkerPool
wp = WorkerPool()
print(f"size={wp.size}, active={wp.active_count}")
`;
            const raw = runPython(script);
            return okResult(raw || 'unknown');
        },
    });
}
