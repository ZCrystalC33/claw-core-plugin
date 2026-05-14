import { Type } from '@sinclair/typebox';
import { spawn } from 'node:child_process';
import { okResult, errResult } from '../index.js';
const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';
function runPython(script, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const py = spawn('python3', ['-c', script]);
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
            py.kill();
            reject(new Error('Python subprocess timed out'));
        }, timeoutMs);
        py.stdout.on('data', (d) => (stdout += d.toString()));
        py.stderr.on('data', (d) => (stderr += d.toString()));
        py.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0)
                resolve(stdout.trim());
            else
                reject(new Error(stderr || `exit ${code}`));
        });
        py.on('error', (e) => {
            clearTimeout(timer);
            reject(e);
        });
    });
}
function runPythonWithStdin(script, stdinData, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const py = spawn('python3', ['-c', script]);
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
            py.kill();
            reject(new Error('Python subprocess timed out'));
        }, timeoutMs);
        py.stdout.on('data', (d) => (stdout += d.toString()));
        py.stderr.on('data', (d) => (stderr += d.toString()));
        py.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0)
                resolve(stdout.trim());
            else
                reject(new Error(stderr || `exit ${code}`));
        });
        py.on('error', (e) => {
            clearTimeout(timer);
            reject(e);
        });
        py.stdin.write(JSON.stringify(stdinData));
        py.stdin.end();
    });
}
export function registerDecomposeRouterTools(api) {
    api.registerTool({
        name: 'clawcore_decompose',
        label: '🔪 ClawCore Decompose',
        description: 'Break a natural language task into structured subtasks using efficiency_core',
        parameters: Type.Object({
            task: Type.String({ description: 'The task to decompose' }),
        }),
        async execute(_id, _params) {
            const params = _params;
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core import decompose

input_data = json.load(sys.stdin)
result = decompose(input_data['task'])

def subtask_to_dict(s):
    return {
        "id": s.id,
        "task": s.task,
        "intent": s.intent,
        "assigned_to": s.assigned_to,
        "priority": s.priority.value if hasattr(s.priority, "value") else str(s.priority),
        "status": s.status.value if hasattr(s.status, "value") else str(s.status),
        "depends_on": s.depends_on,
        "result": s.result,
        "error": s.error
    }

decomp = {
    "main_task": result.main_task,
    "raw_input": result.raw_input,
    "intent": result.intent,
    "entities": result.entities,
    "subtasks": [subtask_to_dict(s) for s in result.subtasks]
}
print(json.dumps(decomp))
`;
                const raw = await runPythonWithStdin(script, { task: params.task });
                const data = JSON.parse(raw);
                const lines = [`**Task:** ${params.task}`, '', '**Subtasks:**'];
                const items = data.subtasks ?? [];
                items.forEach((s, i) => {
                    lines.push(`${i + 1}. 🎯 ${s.task}`);
                    if (s.depends_on?.length)
                        lines.push(`   └─ Dependencies: ${s.depends_on.join(', ')}`);
                });
                return okResult(lines.join('\n'), { task: params.task, count: items.length });
            }
            catch (e) {
                return errResult(`Decompose failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'clawcore_route_task',
        label: '🧭 ClawCore Route Task',
        description: 'Route subtasks to appropriate agents using efficiency_core router',
        parameters: Type.Object({
            task: Type.String({ description: 'Task to decompose and route' }),
            strategy: Type.Optional(Type.String({ description: 'Strategy: capability, load_balance, speed, random (default: capability)' })),
        }),
        async execute(_id, _params) {
            const params = _params;
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core import decompose, get_router

input_data = json.load(sys.stdin)
decomp = decompose(input_data['task'])
router = get_router()
if router is None:
    from efficiency_core import TaskRouter
    router = TaskRouter()

routes = []
for s in decomp.subtasks:
    agent = s.assigned_to or 'unassigned'
    routes.append({
        "subtask_id": s.id,
        "subtask": s.task,
        "agent": agent,
        "strategy": "${params.strategy ?? 'capability'}",
        "reason": f"matched {s.intent or 'general'}"
    })
print(json.dumps({"decisions": routes, "total": len(routes)}))
`;
                const raw = await runPythonWithStdin(script, { task: params.task, strategy: params.strategy });
                const data = JSON.parse(raw);
                const lines = ['**Routing Decisions:**'];
                const decisions = data.decisions ?? [];
                decisions.forEach((d, i) => {
                    lines.push(`${i + 1}. → **${d.agent ?? 'unassigned'}** (${d.subtask})`);
                    lines.push(`   Strategy: ${d.strategy ?? params.strategy ?? 'capability'}`);
                    lines.push(`   Reason: ${d.reason ?? 'matched capability'}`);
                });
                return okResult(lines.join('\n'), { count: decisions.length });
            }
            catch (e) {
                return errResult(`Route task failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'clawcore_router_status',
        label: '📡 Router Status',
        description: 'Get router status and registered agents',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core import get_router, TaskRouter

router = get_router()
if router is None:
    router = TaskRouter()

stats = router.get_stats() if hasattr(router, 'get_stats') else {}
print(json.dumps({'stats': stats, 'type': type(router).__name__}))
`;
                const raw = await runPython(script);
                return okResult(raw);
            }
            catch (e) {
                return errResult(`Router status failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'clawcore_quick_run',
        label: '⚡ ClawCore Quick Run',
        description: 'Run a complete task: decompose → route → execute → integrate',
        parameters: Type.Object({
            task: Type.String({ description: 'Task to execute end-to-end' }),
        }),
        async execute(_id, _params) {
            const params = _params;
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core import quick_run

input_data = json.load(sys.stdin)
result = quick_run(input_data['task'])
if hasattr(result, '__dict__'):
    result = vars(result)
print(json.dumps(result, default=str))
`;
                const raw = await runPythonWithStdin(script, { task: params.task }, 60000);
                const data = JSON.parse(raw);
                return okResult(JSON.stringify(data, null, 2));
            }
            catch (e) {
                return errResult(`Quick run failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
}
