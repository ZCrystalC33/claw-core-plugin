import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

export function registerMonitorTools(api) {
    api.registerTool({
        name: 'clawcore_monitor_metrics',
        label: '📈 ClawCore Monitor',
        description: 'Get system monitor metrics',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.monitor import SystemMonitor
m = SystemMonitor()
metrics = m.get_metrics() if hasattr(m, 'get_metrics') else str(m)
print(metrics)
`;
            let raw;
            try {
                raw = execSync(`python3 -c "${script}"`, {cwd: CORE_CWD, timeout: 15, encoding: 'utf8'}).trim();
            } catch(e) { return errResult('Monitor failed'); }
            return okResult(raw);
        },
    });
    
    api.registerTool({
        name: 'clawcore_monitor_alerts',
        label: '🚨 ClawCore Alerts',
        description: 'Get active system alerts',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}/src')
from efficiency_core.monitor import SystemMonitor
m = SystemMonitor()
alerts = m.get_alerts() if hasattr(m, 'get_alerts') else []
print(alerts)
`;
            let raw;
            try {
                raw = execSync(`python3 -c "${script}"`, {cwd: CORE_CWD, timeout: 15, encoding: 'utf8'}).trim();
            } catch(e) { return errResult('Alerts failed'); }
            return okResult(raw);
        },
    });
}