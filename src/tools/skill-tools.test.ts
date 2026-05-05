/**
 * Skill Tools Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock PluginState
const createMockState = () => ({
  skillVersioning: {
    createVersion: vi.fn().mockResolvedValue({ id: 'v1', version: '1.0.0' }),
    getVersion: vi.fn().mockResolvedValue({ id: 'v1', version: '1.0.0' }),
    listVersions: vi.fn().mockResolvedValue([{ id: 'v1', version: '1.0.0' }]),
    computeDiff: vi.fn().mockReturnValue({ added: 0, removed: 0 }),
    getStats: vi.fn().mockReturnValue({ totalVersions: 5 }),
    rollback: vi.fn().mockResolvedValue({ success: true }),
  },
  skillManager: {
    discover: vi.fn().mockResolvedValue({ ok: true, data: [{ id: 'test', slug: 'test', name: 'Test', version: '1.0.0', description: 'Test skill', path: '/test', content: 'content' }] }),
    getSkill: vi.fn().mockResolvedValue({ ok: true, data: { id: 'test', slug: 'test', name: 'Test', version: '1.0.0', description: 'Test skill', path: '/test', content: 'content' } }),
  },
  skillIndexer: {
    indexSkill: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue({ totalIndexed: 10 }),
  },
  skillValidator: {
    validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  },
  skillMerger: {
    merge: vi.fn().mockResolvedValue({ id: 'merged', version: '2.0.0' }),
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

describe('Skill Tools', () => {
  let mockState: ReturnType<typeof createMockState>;
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(async () => {
    mockState = createMockState();
    mockApi = createMockApi();
    vi.resetModules();
  });

  it('should register zcrystal_version_create tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_version_create')).toBe(true);
  });

  it('should register zcrystal_version_get tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_version_get')).toBe(true);
  });

  it('should register zcrystal_version_list tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_version_list')).toBe(true);
  });

  it('should register zcrystal_version_diff tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_version_diff')).toBe(true);
  });

  it('should register zcrystal_version_stats tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_version_stats')).toBe(true);
  });

  it('should register zcrystal_version_rollback tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_version_rollback')).toBe(true);
  });

  it('should register zcrystal_skill_versions tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_skill_versions')).toBe(true);
  });

  it('should register zcrystal_skill_rollback tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_skill_rollback')).toBe(true);
  });

  it('should register zcrystal_validator_validate tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_validator_validate')).toBe(true);
  });

  it('should register zcrystal_merger_suggest tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_merger_suggest')).toBe(true);
  });

  it('should register zcrystal_indexer_index tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_indexer_index')).toBe(true);
  });

  it('should register zcrystal_indexer_search tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_indexer_search')).toBe(true);
  });

  it('should register zcrystal_indexer_rebuild tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_indexer_rebuild')).toBe(true);
  });

  it('should register zcrystal_indexer_stats tool', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tools = mockApi.getTools();
    expect(tools.some(t => t.name === 'zcrystal_indexer_stats')).toBe(true);
  });

  it('should execute zcrystal_version_stats', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    const tool = mockApi.getTools().find(t => t.name === 'zcrystal_version_stats');
    const result = await tool.execute('123', {});
    
    expect(result.content[0].text).toContain('totalVersions');
  });

  it('should execute zcrystal_indexer_rebuild with success', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);

    const tool = mockApi.getTools().find(t => t.name === 'zcrystal_indexer_rebuild');
    const result = await tool.execute('123', {});

    // FIX: Now properly implemented - okResult doesn't set isError, so check it's falsy
    expect(result.isError || false).toBe(false);
    expect(result.content[0].text).toContain('Indexer rebuild complete');
  });

  it('should count 15 skill tools', async () => {
    const { registerSkillTools } = await import('./skill-tools.js');
    registerSkillTools(mockApi, mockState);
    
    expect(mockApi.getTools().length).toBe(15);
  });
});
