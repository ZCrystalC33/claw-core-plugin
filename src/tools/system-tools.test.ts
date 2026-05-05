/**
 * System Tools Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock PluginState
const createMockState = () => ({
  reviewEngine: {
    getStats: vi.fn().mockReturnValue({ totalReviews: 5 }),
    getUpgradeSuggestions: vi.fn().mockReturnValue([]),
    onTaskCompleted: vi.fn(),
  },
  hookRegistry: {
    dispatch: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockReturnValue({}),
  },
  evolutionCoordinator: {
    getStatus: vi.fn().mockReturnValue({ running: false }),
    registerSkill: vi.fn(),
    triggerEvolution: vi.fn(),
    getEvolutionHistory: vi.fn().mockReturnValue([]),
  },
  circuitBreaker: {
    isOpen: vi.fn().mockReturnValue(false),
    getStatus: vi.fn().mockReturnValue({ state: 'closed' }),
  },
  rateLimiter: {
    check: vi.fn().mockReturnValue({ allowed: true }),
    getStatus: vi.fn().mockReturnValue({ tokens: 100 }),
  },
  metrics: {
    getStats: vi.fn().mockReturnValue({ total: 0 }),
    record: vi.fn(),
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

describe('System Tools', () => {
  let mockState: ReturnType<typeof createMockState>;
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(async () => {
    mockState = createMockState();
    mockApi = createMockApi();
    vi.resetModules();
  });

  // Review Tools
  it('should register zcrystal_review_stats', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_review_stats')).toBe(true);
  });

  it('should register zcrystal_review_suggestions', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_review_suggestions')).toBe(true);
  });

  it('should register zcrystal_review_record', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_review_record')).toBe(true);
  });

  // Hook Tools
  it('should register zcrystal_hook_register', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_hook_register')).toBe(true);
  });

  it('should register zcrystal_hook_dispatch', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_hook_dispatch')).toBe(true);
  });

  it('should register zcrystal_hook_list', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_hook_list')).toBe(true);
  });

  // Evolution Coordinator Tools
  it('should register zcrystal_coordinator_status', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_coordinator_status')).toBe(true);
  });

  it('should register zcrystal_coordinator_register', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_coordinator_register')).toBe(true);
  });

  it('should register zcrystal_coordinator_evolve', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_coordinator_evolve')).toBe(true);
  });

  it('should register zcrystal_coordinator_queue', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_coordinator_queue')).toBe(true);
  });

  it('should register zcrystal_scheduler_start', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_scheduler_start')).toBe(true);
  });

  it('should register zcrystal_scheduler_stop', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    expect(mockApi.getTools().some((t: any) => t.name === 'zcrystal_scheduler_stop')).toBe(true);
  });

  it('should count 12 system tools', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    expect(mockApi.getTools().length).toBe(12);
  });

  it('should execute zcrystal_review_stats', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    const tool = mockApi.getTools().find((t: any) => t.name === 'zcrystal_review_stats');
    const result = await tool.execute('123', {});
    expect(result.content[0].text).toContain('totalReviews');
  });

  it('should execute zcrystal_hook_register successfully', async () => {
    const { registerSystemTools } = await import('./system-tools.js');
    registerSystemTools(mockApi, mockState);
    const tool = mockApi.getTools().find((t: any) => t.name === 'zcrystal_hook_register');
    const result = await tool.execute('123', { name: 'test', handler: 'test' });
    // FIX: Now properly implemented - returns okResult with hook registration confirmation
    expect(result.isError || false).toBe(false);
    expect(result.content[0].text).toContain('Hook registered');
  });
});
