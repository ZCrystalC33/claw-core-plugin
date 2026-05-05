/**
 * Proactive Tools Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Create mock PluginState
const createMockState = () => ({
    router: {
        memoryStoreData: vi.fn().mockResolvedValue({ success: true }),
        memoryLoad: vi.fn().mockResolvedValue({ success: true, data: null }),
    },
    reviewEngine: {
        getStats: vi.fn().mockReturnValue({ suggestions: [] }),
        getUpgradeSuggestions: vi.fn().mockReturnValue([]),
    },
    selfEvolution: {
        getStatus: vi.fn().mockReturnValue({ running: false }),
    },
    evolutionCoordinator: {
        getEvolutionStatus: vi.fn().mockResolvedValue({ success: true, data: { running: false } }),
    },
    metrics: {
        record: vi.fn(),
        getStats: vi.fn().mockReturnValue({}),
    },
});
// Mock api
const createMockApi = () => {
    const tools = [];
    return {
        registerTool: vi.fn((tool) => tools.push(tool)),
        getTools: () => tools,
    };
};
describe('Proactive Tools', () => {
    let mockState;
    let mockApi;
    beforeEach(async () => {
        mockState = createMockState();
        mockApi = createMockApi();
        vi.resetModules();
    });
    it('should register zcrystal_correction_add', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_correction_add')).toBe(true);
    });
    it('should register zcrystal_correction_list', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_correction_list')).toBe(true);
    });
    it('should register zcrystal_memory_add', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_memory_add')).toBe(true);
    });
    it('should register zcrystal_memory_get', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_memory_get')).toBe(true);
    });
    it('should register zcrystal_pattern_add', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_pattern_add')).toBe(true);
    });
    it('should register zcrystal_pattern_list', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_pattern_list')).toBe(true);
    });
    it('should register zcrystal_session_set', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_session_set')).toBe(true);
    });
    it('should register zcrystal_session_get', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_session_get')).toBe(true);
    });
    it('should register zcrystal_session_clear', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_session_clear')).toBe(true);
    });
    it('should register zcrystal_proactive_check', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_proactive_check')).toBe(true);
    });
    it('should register zcrystal_proactive_suggest', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_proactive_suggest')).toBe(true);
    });
    it('should register zcrystal_proactive_log', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_proactive_log')).toBe(true);
    });
    it('should register zcrystal_proactive_recent', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_proactive_recent')).toBe(true);
    });
    it('should register zcrystal_log_action', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_log_action')).toBe(true);
    });
    it('should register zcrystal_log_recent', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_log_recent')).toBe(true);
    });
    it('should register zcrystal_webhook_telegram', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_webhook_telegram')).toBe(true);
    });
    it('should register zcrystal_webhook_signal', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_webhook_signal')).toBe(true);
    });
    it('should register zcrystal_webhook_generic', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_webhook_generic')).toBe(true);
    });
    it('should register zcrystal_heartbeat_run', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_heartbeat_run')).toBe(true);
    });
    it('should register zcrystal_heartbeat_status', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_heartbeat_status')).toBe(true);
    });
    it('should register zcrystal_layers_exchange', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_layers_exchange')).toBe(true);
    });
    it('should register zcrystal_predict', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_predict')).toBe(true);
    });
    it('should register zcrystal_selfimproving_status', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().some((t) => t.name === 'zcrystal_selfimproving_status')).toBe(true);
    });
    it('should count 23 proactive tools', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        expect(mockApi.getTools().length).toBe(23);
    });
    it('should execute zcrystal_correction_add', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        const tool = mockApi.getTools().find((t) => t.name === 'zcrystal_correction_add');
        const result = await tool.execute('123', { context: 'test', reflection: 'test' });
        expect(result.content[0].text).toContain('Correction stored');
    });
    it('should execute zcrystal_session_get', async () => {
        const { registerProactiveTools } = await import('./proactive-tools.js');
        registerProactiveTools(mockApi, mockState);
        const tool = mockApi.getTools().find((t) => t.name === 'zcrystal_session_get');
        const result = await tool.execute('123', {});
        expect(result.content[0].text).toBeDefined();
    });
});
//# sourceMappingURL=proactive-tools.test.js.map