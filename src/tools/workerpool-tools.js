import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

export function registerWorkerpoolTools(api) {
    api.registerTool({
        name: 'clawcore_workerpool_stats',
        label: '👷 ClawCore WorkerPool',
        description: 'Get worker pool statistics',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.workerpool import WorkerPool
wp = WorkerPool()
stats = wp.get_stats() if hasattr(wp, 'get_stats') else str(wp)
print(stats)
`;
            let raw;
            try {
                raw = execSync(`python3 -c "${script}"`, {cwd: CORE_CWD, timeout: 15, encoding: 'utf8'}).trim();
            } catch(e) { return errResult('WorkerPool failed'); }
            return okResult(raw);
        },
    });
    
    api.registerTool({
        name: 'clawcore_workerpool_submit',
        label: '📦 ClawCore Submit Job',
        description: 'Submit a job to the worker pool',
        parameters: Type.Object({
            job_id: Type.String(),
            task: Type.String(),
        }),
        async execute(_id, _params) {
            const params = _params;
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.workerpool import WorkerPool
wp = WorkerPool()
result = wp.submit('${params.job_id}', '${params.task}')
print(result)
`;
            let raw;
            try {
                raw = execSync(`python3 -c "${script}"`, {cwd: CORE_CWD, timeout: 15, encoding: 'utf8'}).trim();
            } catch(e) { return errResult('Submit failed'); }
            return okResult(raw);
        },
    });
}