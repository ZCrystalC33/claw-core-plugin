import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

export function registerCoordinatorTools(api) {
    api.registerTool({
        name: 'clawcore_coordinator_status',
        label: '🎯 ClawCore Coordinator',
        description: 'Get coordinator status and task list',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.coordinator import Coordinator
c = Coordinator()
status = c.get_status() if hasattr(c, 'get_status') else str(c)
print(status)
`;
            let raw;
            try {
                raw = execSync(`python3 -c "${script}"`, {cwd: CORE_CWD, timeout: 15, encoding: 'utf8'}).trim();
            } catch(e) { return errResult('Coordinator failed'); }
            return okResult(raw);
        },
    });
}