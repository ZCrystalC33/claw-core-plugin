/**
 * Workflow Tools Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock PluginState
const createMockState = () => ({
  workflowEngine: {
    createTask: vi.fn().mockReturnValue({ id: 'task-1' }),
    getTask: vi.fn().mockReturnValue({ id: 'task-1', status: 'pending' }),
    getStats: vi.fn().mockReturnValue({ total: 5 }),
    pauseTask: vi.fn().mockReturnValue(true),
    resumeTask: vi.fn().mockReturnValue(true),
    cancelTask: vi.fn().mockReturnValue(true),
  },
  skillAdapter: {
    scanOpenClaw: vi.fn().mockResolvedValue({ skills: [] }),
    scanZcrystal: vi.fn().mockResolvedValue({ skills: [] }),
    importSkill: vi.fn().mockResolvedValue({ success: true }),
    exportSkill: vi.fn().mockResolvedValue({ success: true }),
    syncAll: vi.fn().mockResolvedValue({ synced: 0 }),
  },
  skillSyncManager: {
    sync: vi.fn().mockResolvedValue({ synced: 0 }),
    getStatus: vi.fn().mockReturnValue({ lastSync: null }),
  },
  replayRunner: {
    saveReplayCase: vi.fn().mockReturnValue({ id: 'case-1' }),
    getReplayCase: vi.fn().mockReturnValue({ id: 'case-1' }),
    listReplayCases: vi.fn().mockReturnValue([]),
    getStats: vi.fn().mockReturnValue({ totalCases: 0 }),
    rollback: vi.fn().mockResolvedValue({ success: true }),
  },
});

// Mock api
const createMockApi = () => {
  const tools: any[] = [];
  return {
    registerTool: vi.fn((tool: any) => tools.push(tool)),
    getTools: () => tools,
  };
};

describe('Workflow Tools', () => {
  let mockState: ReturnType<typeof createMockState>;
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(async () => {
    mockState = createMockState();
    mockApi = createMockApi();
    vi.resetModules();
  });

  // Workflow Tools
  it('should register zcrystal_workflow_create tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_workflow_create')).toBe(true);
  });

  it('should register zcrystal_workflow_get tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_workflow_get')).toBe(true);
  });

  it('should register zcrystal_workflow_stats tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_workflow_stats')).toBe(true);
  });

  it('should register zcrystal_workflow_pause tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_workflow_pause')).toBe(true);
  });

  it('should register zcrystal_workflow_resume tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_workflow_resume')).toBe(true);
  });

  it('should register zcrystal_workflow_cancel tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_workflow_cancel')).toBe(true);
  });

  // Adapter Tools
  it('should register zcrystal_adapter_scan_openclaw tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_adapter_scan_openclaw')).toBe(true);
  });

  it('should register zcrystal_adapter_scan_zcrystal tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_adapter_scan_zcrystal')).toBe(true);
  });

  it('should register zcrystal_adapter_import tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_adapter_import')).toBe(true);
  });

  it('should register zcrystal_adapter_export tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_adapter_export')).toBe(true);
  });

  it('should register zcrystal_adapter_sync tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_adapter_sync')).toBe(true);
  });

  // Replay Tools
  it('should register zcrystal_replay_save tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_replay_save')).toBe(true);
  });

  it('should register zcrystal_replay_get tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_replay_get')).toBe(true);
  });

  it('should register zcrystal_replay_list tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_replay_list')).toBe(true);
  });

  it('should register zcrystal_replay_stats tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_replay_stats')).toBe(true);
  });

  it('should register zcrystal_replay_rollback tool', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_replay_rollback')).toBe(true);
  });

  it('should count 16 workflow tools', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    expect(mockApi.getTools().length).toBe(16);
  });

  it('should execute zcrystal_workflow_create', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    const tool = mockApi.getTools().find((t: any) => t.name === 'zcrystal_workflow_create');
    const result = await tool.execute('123', { userId: 'user1', taskType: 'chat', trigger: 'manual', repr: 'test' });
    expect(result.content[0].text).toContain('Workflow created');
  });

  it('should execute zcrystal_workflow_stats', async () => {
    const { registerWorkflowTools } = await import('./workflow-tools.js');
    registerWorkflowTools(mockApi, mockState);
    const tool = mockApi.getTools().find((t: any) => t.name === 'zcrystal_workflow_stats');
    const result = await tool.execute('123', {});
    expect(result.content[0].text).toContain('total');
  });
});
