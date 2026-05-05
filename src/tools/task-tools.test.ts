/**
 * Task Tools Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock PluginState
const createMockState = () => ({
  router: {
    createTask: vi.fn().mockResolvedValue({ success: true, data: { taskId: 'task-1' } }),
    getTask: vi.fn().mockResolvedValue({ success: true, data: { id: 'task-1', status: 'pending' } }),
    getTaskStats: vi.fn().mockResolvedValue({ success: true, data: { total: 10 } }),
    memoryStoreData: vi.fn().mockResolvedValue({ success: true }),
    memoryLoad: vi.fn().mockResolvedValue({ success: true, data: 'test data' }),
    memorySearch: vi.fn().mockResolvedValue({ success: true, data: [] }),
    memoryDelete: vi.fn().mockResolvedValue({ success: true }),
    getEvolutionStatus: vi.fn().mockResolvedValue({ success: true, data: { running: false } }),
    listModels: vi.fn().mockResolvedValue({ success: true, data: [] }),
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

describe('Task Tools', () => {
  let mockState: ReturnType<typeof createMockState>;
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(async () => {
    mockState = createMockState();
    mockApi = createMockApi();
    vi.resetModules();
  });

  it('should register zcrystal_task_create tool', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_task_create')).toBe(true);
  });

  it('should register zcrystal_task_get tool', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_task_get')).toBe(true);
  });

  it('should register zcrystal_task_stats tool', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_task_stats')).toBe(true);
  });

  it('should register zcrystal_model_pick tool', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_model_pick')).toBe(true);
  });

  it('should register zcrystal_evo_ready tool', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_evo_ready')).toBe(true);
  });

  it('should register zcrystal_memory_store tool', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_memory_store')).toBe(true);
  });

  it('should register zcrystal_memory_load tool', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_memory_load')).toBe(true);
  });

  it('should register zcrystal_memory_search tool', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_memory_search')).toBe(true);
  });

  it('should register zcrystal_memory_delete tool', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_memory_delete')).toBe(true);
  });

  it('should register zcrystal_memory_stats tool', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_memory_stats')).toBe(true);
  });



  it('should register zcrystal_router_list tool', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_router_list')).toBe(true);
  });

  it('should execute zcrystal_task_create', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tool = mockApi.getTools().find(t => t.name === 'zcrystal_task_create');
    const result = await tool.execute('123', { task_type: 'test', trigger: 'manual', user_id: 'user1', repr: 'test task' });
    
    expect(result.content[0].text).toContain('Task created');
  });

  it('should execute zcrystal_memory_store', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tool = mockApi.getTools().find(t => t.name === 'zcrystal_memory_store');
    const result = await tool.execute('123', { layer: 'L1', key: 'test', value: 'value' });
    
    expect(result.content[0].text).toContain('Memory stored');
  });

  it('should execute zcrystal_task_stats', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    const tool = mockApi.getTools().find(t => t.name === 'zcrystal_task_stats');
    const result = await tool.execute('123', {});
    
    expect(result.content[0].text).toContain('total');
  });

  it('should count 11 task tools', async () => {
    const { registerTaskTools } = await import('./task-tools.js');
    registerTaskTools(mockApi, mockState);
    
    expect(mockApi.getTools().length).toBe(11);
  });
});
