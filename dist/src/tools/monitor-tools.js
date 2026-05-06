/**
 * Monitor Tools - Bridge to Python efficiency_core ProgressMonitor
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

export function registerMonitorTools(api) {
    api.registerTool({
        name: 'clawcore_monitor_progress',
        label: '📈 ClawCore Monitor Progress',
        description: 'Get overall task progress summary',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.monitor import get_monitor
m = get_monitor()
summary = m.get_overall_progress()
print(str(summary))
`;
            const raw = runPython(script);
            return okResult(raw || 'no_progress');
        },
    });

    api.registerTool({
        name: 'clawcore_monitor_active',
        label: '🔄 ClawCore Active Tasks',
        description: 'Get list of active tasks being monitored',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.monitor import get_monitor
m = get_monitor()
tasks = m.get_active_tasks()
print(str(tasks) if tasks else 'no_active')
`;
            const raw = runPython(script);
            return okResult(raw || 'no_active');
        },
    });

    api.registerTool({
        name: 'clawcore_monitor_task',
        label: '📋 ClawCore Task Progress',
        description: 'Track progress of a specific task',
        parameters: Type.Object({
            task_id: Type.String({ description: 'Task ID to track' }),
            action: Type.Optional(Type.String({ description: 'complete|fail|start' })),
        }),
        async execute(_id, _params) {
            const params = _params;
            let script;
            if (params.action === 'complete') {
                script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.monitor import get_monitor
m = get_monitor()
m.complete_task('${params.task_id}')
print('completed')
`;
            } else if (params.action === 'start') {
                script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.monitor import get_monitor
m = get_monitor()
m.start_task('${params.task_id}')
print('started')
`;
            } else {
                script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.monitor import get_monitor
m = get_monitor()
result = m.get_task_summary('${params.task_id}')
print(str(result) if result else 'not_found')
`;
            }
            const raw = runPython(script);
            return okResult(raw || 'ok');
        },
    });
}
