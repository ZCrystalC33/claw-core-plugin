/**
 * Decompose & Router Tools - Async bridge to Python efficiency_core
 * Replaces execSync with async child_process for non-blocking execution.
 */

import { Type } from '@sinclair/typebox';
import { spawn } from 'node:child_process';
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPython(script: string, timeoutMs = 30000): Promise<string> {
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
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr || `exit ${code}`));
    });
    py.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

export function registerDecomposeRouterTools(api: OpenClawPluginApi) {
  // ─── Decompose ───────────────────────────────────────────────────
  api.registerTool({
    name: 'clawcore_decompose',
    label: '🔪 ClawCore Decompose',
    description: 'Break a natural language task into structured subtasks using efficiency_core',
    parameters: Type.Object({
      task: Type.String({ description: 'The task to decompose' }),
      maxSubtasks: Type.Optional(Type.Number({ description: 'Maximum number of subtasks (default: 10)' })),
    }),
    async execute(_id, _params) { const params = _params as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = params as any;
      try {
        const max = params.maxSubtasks ?? 10;
        const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core import decompose, TaskDecomposition

result = decompose('${params.task.replace(/'/g, "\\'")}', max_subtasks=${max})
if hasattr(result, '__dict__'):
    result = vars(result)
# Clean up any non-serializable fields
if isinstance(result, dict):
    result = {k: v for k, v in result.items() if k != 'tools' and k != 'registry'}
print(json.dumps(result, default=str))
`;
        const raw = await runPython(script);
        const data = JSON.parse(raw);
        const lines = [`**Task:** ${params.task}`, '', '**Subtasks:**'];
        if (Array.isArray((data as any).subtasks ?? (data as any).steps)) {
          const items: unknown[] = (data as any).subtasks ?? (data as any).steps ?? [];
          (items as any[]).forEach((s: any, i: number) => {
            lines.push(`${i + 1}. 🎯 ${s.title ?? s.description ?? JSON.stringify(s)}`);
            if (s.dependencies?.length) lines.push(`   └─ Dependencies: ${(s.dependencies as string[]).join(', ')}`);
          });
        } else {
          lines.push(JSON.stringify(data, null, 2));
        }
        return okResult(lines.join('\n'), { task: params.task });
      } catch (e: unknown) {
        return errResult(`Decompose failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  });

  // ─── Route Task ──────────────────────────────────────────────────
  api.registerTool({
    name: 'clawcore_route_task',
    label: '🧭 ClawCore Route Task',
    description: 'Route subtasks to appropriate agents using efficiency_core router',
    parameters: Type.Object({
      subtasks: Type.String({ description: 'JSON array of subtask descriptions' }),
      strategy: Type.Optional(Type.String({ description: 'Strategy: capability, load_balance, speed, random (default: capability)' })),
    }),
    async execute(_id, _params) { const params = _params as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = params as any;
      try {
        const subtasks = params.subtasks.replace(/'/g, "\\'");
        const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core import TaskRouter, route_tasks

router = TaskRouter()
subtasks = json.loads('${subtasks}')
result = route_tasks(subtasks)
if hasattr(result, '__dict__'):
    result = vars(result)
print(json.dumps(result, default=str))
`;
        const raw = await runPython(script);
        const data = JSON.parse(raw);
        const lines = ['**Routing Decisions:**'];
        if (Array.isArray(data.get('decisions') ?? data.get('routes'))) {
          const decisions = data.decisions ?? data.routes ?? [];
          decisions.forEach((d: Record<string, unknown>, i: number) => {
            lines.push(`${i + 1}. → **${d.agent ?? d.target ?? 'unassigned'}**`);
            lines.push(`   Strategy: ${d.strategy ?? params.strategy ?? 'capability'}`);
            lines.push(`   Reason: ${d.reason ?? d.notes ?? 'matched capability'}`);
          });
        } else {
          lines.push(JSON.stringify(data, null, 2));
        }
        return okResult(lines.join('\n'));
      } catch (e: unknown) {
        return errResult(`Route task failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  });

  // ─── Router Status ───────────────────────────────────────────────
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
try:
    agents = router.list_agents()
except:
    agents = []
print(json.dumps({'agent_count': len(agents), 'agents': agents}))
`;
        const raw = await runPython(script);
        return okResult(raw);
      } catch (e: unknown) {
        return errResult(`Router status failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  });

  // ─── Quick Run ────────────────────────────────────────────────────
  api.registerTool({
    name: 'clawcore_quick_run',
    label: '⚡ ClawCore Quick Run',
    description: 'Run a complete task: decompose → route → execute → integrate',
    parameters: Type.Object({
      task: Type.String({ description: 'Task to execute end-to-end' }),
    }),
    async execute(_id, _params) { const params = _params as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = params as any;
      try {
        const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core import quick_run

result = quick_run('${params.task.replace(/'/g, "\\'")}')
if hasattr(result, '__dict__'):
    result = vars(result)
print(json.dumps(result, default=str))
`;
        const raw = await runPython(script, 60000);
        const data = JSON.parse(raw);
        return okResult(JSON.stringify(data, null, 2));
      } catch (e: unknown) {
        return errResult(`Quick run failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  });
}
