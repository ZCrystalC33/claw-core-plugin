/**
 * Workflow, Adapter, Replay Tools
 */
import { Type } from '@sinclair/typebox';
import { okResult, errResult } from '../index.js';
export function registerWorkflowTools(api, state) {
    // Workflow Tools
    api.registerTool({
        name: 'zcrystal_workflow_create',
        label: 'ZCrystal Workflow Create',
        description: 'Create a workflow task',
        parameters: Type.Object({
            taskType: Type.String(),
            trigger: Type.Union([Type.Literal('telegram'), Type.Literal('signal'), Type.Literal('webhook'), Type.Literal('cron'), Type.Literal('manual')]),
            userId: Type.String(), repr: Type.String(),
            input: Type.Optional(Type.Record(Type.String(), Type.Any())),
        }),
        async execute(_id, params) {
            const task = state.workflowEngine.createTask(params.userId, params.taskType, params.trigger, params.repr, params.input || {});
            return okResult('Workflow created: ' + task.id, { taskId: task.id });
        },
    });
    api.registerTool({
        name: 'zcrystal_workflow_get',
        label: 'ZCrystal Workflow Get',
        description: 'Get workflow task by ID',
        parameters: Type.Object({ taskId: Type.String() }),
        async execute(_id, params) {
            const task = state.workflowEngine.getTask(params.taskId);
            if (task)
                return okResult(JSON.stringify(task, null, 2));
            return errResult('Task not found');
        },
    });
    api.registerTool({
        name: 'zcrystal_workflow_stats',
        label: 'ZCrystal Workflow Stats',
        description: 'Get workflow engine statistics',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const stats = state.workflowEngine.getStats();
            return okResult(JSON.stringify(stats, null, 2));
        },
    });
    api.registerTool({
        name: 'zcrystal_workflow_pause',
        label: 'ZCrystal Workflow Pause',
        description: 'Pause a running workflow',
        parameters: Type.Object({ taskId: Type.String() }),
        async execute(_id, params) {
            const success = state.workflowEngine.pauseTask(params.taskId);
            if (success)
                return okResult('Workflow paused: ' + params.taskId);
            return errResult('Failed to pause workflow');
        },
    });
    api.registerTool({
        name: 'zcrystal_workflow_resume',
        label: 'ZCrystal Workflow Resume',
        description: 'Resume a paused workflow',
        parameters: Type.Object({ taskId: Type.String() }),
        async execute(_id, params) {
            const success = state.workflowEngine.resumeTask(params.taskId);
            if (success)
                return okResult('Workflow resumed: ' + params.taskId);
            return errResult('Failed to resume workflow');
        },
    });
    api.registerTool({
        name: 'zcrystal_workflow_cancel',
        label: 'ZCrystal Workflow Cancel',
        description: 'Cancel a workflow',
        parameters: Type.Object({ taskId: Type.String() }),
        async execute(_id, params) {
            const success = state.workflowEngine.cancelTask(params.taskId);
            if (success)
                return okResult('Workflow cancelled: ' + params.taskId);
            return errResult('Failed to cancel workflow');
        },
    });
    // Adapter Tools
    api.registerTool({
        name: 'zcrystal_adapter_scan_openclaw',
        label: 'ZCrystal Adapter Scan OpenClaw',
        description: 'Scan and list all OpenClaw skills',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const result = await state.skillAdapter.scanOpenClawSkills();
            if (result.ok)
                return okResult(JSON.stringify(result.data, null, 2), { count: result.data?.length });
            return errResult('Scan failed: ' + result.error);
        },
    });
    api.registerTool({
        name: 'zcrystal_adapter_scan_zcrystal',
        label: 'ZCrystal Adapter Scan ZCrystal',
        description: 'Scan and list all ZCrystal skills',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const result = await state.skillAdapter.scanZCrystalSkills();
            if (result.ok)
                return okResult(JSON.stringify(result.data, null, 2), { count: result.data?.length });
            return errResult('Scan failed: ' + result.error);
        },
    });
    api.registerTool({
        name: 'zcrystal_adapter_import',
        label: 'ZCrystal Adapter Import',
        description: 'Import an OpenClaw skill to ZCrystal',
        parameters: Type.Object({ skillSlug: Type.String() }),
        async execute(_id, params) {
            const result = await state.skillAdapter.importSkill(params.skillSlug);
            if (result.ok)
                return okResult('Imported: ' + params.skillSlug, { skillId: result.data?.slug });
            return errResult('Import failed: ' + result.error);
        },
    });
    api.registerTool({
        name: 'zcrystal_adapter_export',
        label: 'ZCrystal Adapter Export',
        description: 'Export a ZCrystal skill to OpenClaw',
        parameters: Type.Object({ skillId: Type.String() }),
        async execute(_id, params) {
            const result = await state.skillAdapter.exportSkill(params.skillId);
            if (result.ok)
                return okResult('Exported: ' + params.skillId);
            return errResult('Export failed: ' + result.error);
        },
    });
    api.registerTool({
        name: 'zcrystal_adapter_sync',
        label: 'ZCrystal Adapter Sync',
        description: 'Sync all skills between ZCrystal and OpenClaw',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const result = await state.skillSyncManager.syncAll();
            if (result.ok)
                return okResult('Sync complete', result.data);
            return errResult('Sync failed: ' + result.error);
        },
    });
    // Replay Tools
    api.registerTool({
        name: 'zcrystal_replay_save',
        label: 'ZCrystal Replay Save',
        description: 'Save a replay case for regression testing',
        parameters: Type.Object({
            taskId: Type.String(), taskType: Type.String(),
            input: Type.Record(Type.String(), Type.Any()), output: Type.Record(Type.String(), Type.Any()),
        }),
        async execute(_id, params) {
            const replayCase = state.replayRunner.saveReplayCase(params.taskId, params.taskType, params.input, params.output);
            return okResult('Replay case saved', { caseId: replayCase.id });
        },
    });
    api.registerTool({
        name: 'zcrystal_replay_get',
        label: 'ZCrystal Replay Get',
        description: 'Get a replay case by ID',
        parameters: Type.Object({ caseId: Type.String() }),
        async execute(_id, params) {
            const replayCase = state.replayRunner.getCase(params.caseId);
            if (replayCase)
                return okResult(JSON.stringify(replayCase, null, 2));
            return errResult('Replay case not found');
        },
    });
    api.registerTool({
        name: 'zcrystal_replay_list',
        label: 'ZCrystal Replay List',
        description: 'List replay cases by task type',
        parameters: Type.Object({ taskType: Type.Optional(Type.String()) }),
        async execute(_id, params) {
            let cases = [];
            if (params.taskType)
                cases = state.replayRunner.getCasesForTaskType(params.taskType);
            return okResult(JSON.stringify(cases, null, 2), { count: cases?.length || 0 });
        },
    });
    api.registerTool({
        name: 'zcrystal_replay_stats',
        label: 'ZCrystal Replay Stats',
        description: 'Get replay system statistics',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const stats = state.replayRunner.getReplayStats();
            return okResult(JSON.stringify(stats, null, 2));
        },
    });
    api.registerTool({
        name: 'zcrystal_replay_rollback',
        label: 'ZCrystal Replay Rollback',
        description: 'Rollback a skill to the previous version',
        parameters: Type.Object({ skillId: Type.String() }),
        async execute(_id, params) {
            const result = state.replayRunner.rollback(params.skillId);
            if (result.success)
                return okResult('Rolled back to: ' + result.previousVersion);
            return errResult(result.error || 'Rollback failed');
        },
    });
}
//# sourceMappingURL=workflow-tools.js.map