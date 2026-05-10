// Decomposer tools - Real bridge to Python efficiency_core decomposer
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
            maxSubtasks: Type.Optional(Type.Number()),
        }),
        async execute(_id, params) {
            try {
                const max = params.maxSubtasks ?? 10;
                const script = [
                    'import sys, json',
                    'sys.path.insert(0, "/home/snow/.openclaw/workspace/openclaw-efficiency-core")',
                    'from efficiency_core import decompose',
                    'input_data = json.loads(sys.stdin.read())',
                    'result = decompose(input_data["task"], max_subtasks=input_data.get("max_subtasks", 10))',
                    'if hasattr(result, "__dict__"): result = vars(result)',
                    'result = {k: v for k, v in result.items() if k not in ("tools", "registry")}',
                    'print(json.dumps(result, default=str))'
                ].join('\n');
                const raw = await runPythonWithStdin(script, { task: params.task, max_subtasks: max });
                const data = JSON.parse(raw);
                const items = data.subtasks ?? data.steps ?? [];
                const lines = ['**Task:** ' + params.task, '', '**Subtasks:**'];
                items.forEach((s, i) => {
                    lines.push((i + 1) + '. ' + (s.title ?? s.description ?? JSON.stringify(s)));
                    if (s.dependencies?.length)
                        lines.push('   └─ ' + s.dependencies.join(', '));
                });
                return okResult(lines.join('\n'), { task: params.task, count: items.length });
            }
            catch (e) {
                return errResult('Decompose failed: ' + (e instanceof Error ? e.message : String(e)));
            }
        },
    });
}
//# sourceMappingURL=decomposer-tools.js.map