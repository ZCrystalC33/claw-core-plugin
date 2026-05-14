import { Type } from '@sinclair/typebox';
import { spawn } from 'node:child_process';
import { okResult, errResult } from '../index.js';
function runPythonWithStdin(script, stdinData, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const py = spawn('python3', ['-c', script]);
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => { py.kill(); reject(new Error('Python timeout')); }, timeoutMs);
        py.stdout.on('data', (d) => (stdout += d.toString()));
        py.stderr.on('data', (d) => (stderr += d.toString()));
        py.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0)
                resolve(stdout.trim());
            else
                reject(new Error(stderr || 'exit ' + code));
        });
        py.on('error', (e) => { clearTimeout(timer); reject(e); });
        py.stdin.write(JSON.stringify(stdinData));
        py.stdin.end();
    });
}
export function registerDecomposerTools(api) {
    api.registerTool({
        name: 'decomposer_decompose',
        label: 'Decomposer',
        description: 'Decompose task into subtasks using Python efficiency_core',
        parameters: Type.Object({
            task: Type.String(),
        }),
        async execute(_id, params) {
            try {
                const script = [
                    'import sys, json',
                    'sys.path.insert(0, "/home/snow/.openclaw/workspace/openclaw-efficiency-core")',
                    'from efficiency_core import decompose',
                    'from efficiency_core.decomposer import SubTask, TaskDecomposition',
                    'input_data = json.loads(sys.stdin.read())',
                    'result = decompose(input_data["task"])',
                    'def subtask_to_dict(s):',
                    '    return {"id": s.id, "task": s.task, "intent": s.intent, "assigned_to": s.assigned_to, "priority": s.priority.value if hasattr(s.priority, "value") else str(s.priority), "status": s.status.value if hasattr(s.status, "value") else str(s.status), "depends_on": s.depends_on, "result": s.result, "error": s.error}',
                    'decomp = {"main_task": result.main_task, "raw_input": result.raw_input, "intent": result.intent, "entities": result.entities, "subtasks": [subtask_to_dict(s) for s in result.subtasks]}',
                    'print(json.dumps(decomp))'
                ].join('\n');
                const raw = await runPythonWithStdin(script, { task: params.task });
                const data = JSON.parse(raw);
                const items = data.subtasks ?? [];
                const lines = ['**Task:** ' + params.task, '', '**Subtasks:**'];
                items.forEach((s, i) => {
                    lines.push((i + 1) + '. 🎯 ' + s.task);
                    if (s.depends_on?.length)
                        lines.push('   └─ Dependencies: ' + s.depends_on.join(', '));
                });
                return okResult(lines.join('\n'), { task: params.task, count: items.length });
            }
            catch (e) {
                return errResult('Decompose failed: ' + (e instanceof Error ? e.message : String(e)));
            }
        },
    });
}
