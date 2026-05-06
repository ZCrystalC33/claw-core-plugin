/**
 * Pipeline & StateMachine Tools - Bridge to Python efficiency_core.pipeline & statemachine
 */
import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';
const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';
function runPython(script) {
    return execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
        cwd: CORE_CWD,
        timeout: 15000,
    }).trim();
}
export function registerPipelineTools(api) {
    // ─── Pipeline List ───────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_pipeline_list',
        label: '🔗 Pipeline List',
        description: 'List available pipeline templates',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.pipeline import Pipeline, Stage, PipelineBuilder

# Built-in templates
templates = {
  'data_processing': {
    'description': 'Fetch → Transform → Save',
    'stages': ['fetch', 'transform', 'save']
  },
  'task_decomposition': {
    'description': 'Decompose → Route → Execute → Integrate',
    'stages': ['decompose', 'route', 'execute', 'integrate']
  },
  'research': {
    'description': 'Search → Extract → Synthesize → Output',
    'stages': ['search', 'extract', 'synthesize', 'output']
  }
}
print(json.dumps(templates))
`;
                const raw = runPython(script);
                return okResult(raw);
            }
            catch (e) {
                return errResult(`Pipeline list failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    // ─── Pipeline Run ─────────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_pipeline_run',
        label: '▶️ Run Pipeline',
        description: 'Execute a pipeline with a given context',
        parameters: Type.Object({
            pipelineName: Type.String({ description: 'Pipeline name: data_processing, task_decomposition, research' }),
            contextKey: Type.String({ description: 'Key to store result under' }),
            contextValue: Type.String({ description: 'Initial value to process' }),
        }),
        async execute(_id, _params) {
            const params = _params;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = params;
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.pipeline import Pipeline, Stage, PipelineBuilder

def make_${params.pipelineName}_pipeline():
    builder = PipelineBuilder('${params.pipelineName}')
    
    # Stage definitions for each pipeline type
    if '${params.pipelineName}' == 'data_processing':
        def fetch(ctx):
            ctx['data'] = ctx.get('input', '')
            return ctx
        def transform(ctx):
            ctx['transformed'] = ctx.get('data', '') + '_processed'
            return ctx
        def save(ctx):
            ctx['saved'] = True
            return ctx
        builder.add_stage(Stage('fetch', fetch))
        builder.add_stage(Stage('transform', transform))
        builder.add_stage(Stage('save', save))
    
    elif '${params.pipelineName}' == 'task_decomposition':
        def decompose(ctx):
            from efficiency_core import decompose as decomp
            result = decomp(ctx.get('input', ''))
            ctx['subtasks'] = result.subtasks
            return ctx
        def route(ctx):
            ctx['routed'] = len(ctx.get('subtasks', []))
            return ctx
        def integrate(ctx):
            ctx['integrated'] = True
            return ctx
        builder.add_stage(Stage('decompose', decompose))
        builder.add_stage(Stage('route', route))
        builder.add_stage(Stage('integrate', integrate))
    
    elif '${params.pipelineName}' == 'research':
        def search(ctx):
            ctx['results'] = ['search_result_1', 'search_result_2']
            return ctx
        def extract(ctx):
            ctx['extracted'] = ctx.get('results', [])
            return ctx
        def synthesize(ctx):
            ctx['synthesis'] = 'synthesized_content'
            return ctx
        builder.add_stage(Stage('search', search))
        builder.add_stage(Stage('extract', extract))
        builder.add_stage(Stage('synthesize', synthesize))
    
    return builder.build()

pipeline = make_${params.pipelineName}_pipeline()
initial_ctx = {'input': '${params.contextValue.replace(/'/g, "\\'")}', '${params.contextKey}': '${params.contextValue.replace(/'/g, "\\'")}'}
result = pipeline.run(initial_ctx)
print(json.dumps({'pipeline': '${params.pipelineName}', 'context': result}, default=str))
`;
                const raw = runPython(script);
                return okResult(raw);
            }
            catch (e) {
                return errResult(`Pipeline run failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    // ─── StateMachine ─────────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_sm_create',
        label: '🔄 Create StateMachine',
        description: 'Create a workflow state machine',
        parameters: Type.Object({
            name: Type.String(),
            states: Type.Array(Type.String()),
            transitions: Type.Array(Type.Tuple([Type.String(), Type.String(), Type.String()])),
        }),
        async execute(_id, _params) {
            const params = _params;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = params;
            try {
                const statesJson = JSON.stringify(params.states).replace(/"/g, '\\"');
                const transJson = JSON.stringify(params.transitions).replace(/'/g, "\\'");
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.statemachine import StateMachine, create_workflow_machine

sm = create_workflow_machine('${params.name}')
for state in ${statesJson}:
    sm.add_state(state)
for src, event, tgt in ${transJson}:
    sm.add_transition(src, tgt, event)

print(json.dumps({'name': '${params.name}', 'states': ${statesJson}, 'transitions': ${transJson}}))
`;
                const raw = runPython(script);
                return okResult(raw);
            }
            catch (e) {
                return errResult(`SM create failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'clawcore_sm_trigger',
        label: '➡️ SM Trigger',
        description: 'Trigger a state transition',
        parameters: Type.Object({
            name: Type.String(),
            event: Type.String(),
        }),
        async execute(_id, _params) {
            const params = _params;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = params;
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.statemachine import StateMachine, create_workflow_machine

sm = create_workflow_machine('${params.name}')
# Trigger the event and get new state
try:
    sm.trigger('${params.event}')
    current = sm.state
    print(json.dumps({'name': '${params.name}', 'event': '${params.event}', 'current_state': current}))
except Exception as e:
    print(json.dumps({'error': str(e), 'name': '${params.name}', 'event': '${params.event}'}))
`;
                const raw = runPython(script);
                return okResult(raw);
            }
            catch (e) {
                return errResult(`SM trigger failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
    api.registerTool({
        name: 'clawcore_sm_status',
        label: '📊 SM Status',
        description: 'Get state machine current status',
        parameters: Type.Object({
            name: Type.String(),
        }),
        async execute(_id, _params) {
            const params = _params;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = params;
            try {
                const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.statemachine import create_workflow_machine

sm = create_workflow_machine('${params.name}')
print(json.dumps({'name': '${params.name}', 'state': sm.state, 'states': list(sm.states), 'transitions': list(sm.transitions)}))
`;
                const raw = runPython(script);
                return okResult(raw);
            }
            catch (e) {
                return errResult(`SM status failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        },
    });
}
//# sourceMappingURL=pipeline-tools.js.map