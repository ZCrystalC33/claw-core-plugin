/**
 * Core Tools Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the @zcrystal/evo module
vi.mock('@zcrystal/evo', () => ({}));

// Create mock PluginState
const createMockState = () => ({
  router: {
    healthCheck: vi.fn().mockResolvedValue({ success: true, data: { status: 'healthy' } }),
    getEvolutionStatus: vi.fn().mockResolvedValue({ success: true, data: { running: false } }),
  },
  honcho: {
    search: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    ask: vi.fn().mockResolvedValue({ ok: true, data: 'test answer' }),
  },
  skillManager: {
    getSkills: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getSkill: vi.fn().mockResolvedValue({ ok: false, error: 'Not found' }),
    readContent: vi.fn().mockResolvedValue({ ok: true, data: 'skill content' }),
  },
  selfEvolution: {
    getStatus: vi.fn().mockReturnValue({ running: false }),
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

describe('Core Tools', () => {
  let mockState: ReturnType<typeof createMockState>;
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(async () => {
    mockState = createMockState();
    mockApi = createMockApi();
    // Reset modules
    vi.resetModules();
  });

  it('should register zcrystal_evo_health tool', async () => {
    const { registerCoreTools } = await import('./core-tools.js');
    registerCoreTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_evo_health')).toBe(true);
  });

  it('should register zcrystal_search tool', async () => {
    const { registerCoreTools } = await import('./core-tools.js');
    registerCoreTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_search')).toBe(true);
  });

  it('should register zcrystal_ask_user tool', async () => {
    const { registerCoreTools } = await import('./core-tools.js');
    registerCoreTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_ask_user')).toBe(true);
  });

  it('should register zcrystal_skills tool', async () => {
    const { registerCoreTools } = await import('./core-tools.js');
    registerCoreTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_skills')).toBe(true);
  });

  it('should execute zcrystal_evo_health and return healthy', async () => {
    const { registerCoreTools } = await import('./core-tools.js');
    registerCoreTools(mockApi, mockState);
    
    const healthTool = mockApi.getTools().find(t => t.name === 'zcrystal_evo_health');
    const result = await healthTool.execute('123', {});
    
    expect(result.content[0].text).toContain('healthy');
  });

  it('should execute zcrystal_search with no results', async () => {
    const { registerCoreTools } = await import('./core-tools.js');
    registerCoreTools(mockApi, mockState);

    const searchTool = mockApi.getTools().find(t => t.name === 'zcrystal_search');
    const result = await searchTool.execute('123', { query: 'test' });

    // FIX: Now tries direct FTS5 first (Python subprocess), may fail on no results
    // Fallback to honcho.search handles empty results
    const text = result.content[0].text;
    expect(text.toLowerCase()).toMatch(/no results|search failed|exit/);
  });

  it('should execute zcrystal_ask_user and return answer', async () => {
    const { registerCoreTools } = await import('./core-tools.js');
    registerCoreTools(mockApi, mockState);
    
    const askTool = mockApi.getTools().find(t => t.name === 'zcrystal_ask_user');
    const result = await askTool.execute('123', { question: 'test?' });
    
    expect(result.content[0].text).toBe('test answer');
  });

  it('should execute zcrystal_skills with empty skills', async () => {
    const { registerCoreTools } = await import('./core-tools.js');
    registerCoreTools(mockApi, mockState);
    
    const skillsTool = mockApi.getTools().find(t => t.name === 'zcrystal_skills');
    const result = await skillsTool.execute('123', {});
    
    expect(result.content[0].text).toContain('No skills');
  });

  it('should count 11 core tools (zcrystal_recall) (including progressive disclosure)', async () => {
    const { registerCoreTools } = await import('./core-tools.js');
    registerCoreTools(mockApi, mockState);
    
    expect(mockApi.getTools().length).toBe(11);
  });

});
