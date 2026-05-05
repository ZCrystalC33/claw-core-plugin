// ZCrystal Evo type declarations - Permissive for runtime compatibility
// The actual ZCrystal_evo package is loaded at runtime; these declarations
// only exist to satisfy TypeScript's module resolution at compile time.

declare module '@zcrystal/evo' {
  // Allow any property access (matches runtime API surface)
  class UnifiedApiRouter {
    [key: string]: any;
    healthCheck(): Promise<{ success: boolean; data?: any; error?: string }>;
    getEvolutionStatus(): Promise<{ success: boolean; data?: any; error?: string }>;
    startEvolution(...args: any[]): Promise<{ success: boolean; data?: any; error?: string }>;
    listSkills(): Promise<{ success: boolean; data?: { skills?: any[] }; error?: string }>;
    memoryStoreData(...args: any[]): Promise<{ success: boolean; error?: string }>;
    memoryLoad(layer: string, key: string): Promise<{ success: boolean; data?: any; error?: string }>;
  }

  function createHonchoClient(opts: { baseUrl: string; workspace: string }): any;
  function createSkillManager(skillsPath: string): any;

  class SelfEvolutionEngine {
    [key: string]: any;
    constructor(evolutionStore: any, traceStore: any);
  }

  class EvolutionCoordinator {
    [key: string]: any;
    constructor(evolutionStore: any, traceStore: any);
  }

  class EvolutionScheduler {
    [key: string]: any;
    constructor(coordinator: EvolutionCoordinator, getSkills: () => Promise<any[]>, intervalMs: number);
    start(): void;
    stop(): void;
    get running(): boolean;
  }

  class ReviewEngine {
    [key: string]: any;
    getUpgradeSuggestions(): any[];
  }

  class ToolHub {
    [key: string]: any;
    doToolCall(toolName: string, params: Record<string, unknown>, taskId?: string): Promise<{ success: boolean; data?: unknown; error?: string; durationMs?: number }>;
    getToolSchema(name: string): unknown;
    getLogs(_sessionKey?: string, limit?: number): any[];
  }

  class SkillGenerator {
    [key: string]: any;
    generateFromTask(taskType: string, toolChain: string[], parameters: Record<string, unknown>, examples: unknown[], edgeCases: unknown[]): Promise<any>;
    getGenerationStats(): Record<string, unknown>;
  }

  class SkillVersioning { [key: string]: any; }
  class SkillIndexer { [key: string]: any; }
  class SkillValidator { [key: string]: any; }
  class SkillMerger { [key: string]: any; }

  class CircuitBreaker {
    [key: string]: any;
    constructor(opts: { failureThreshold: number; successThreshold: number; timeout: number });
    getState(): string;
    getStats(): Record<string, unknown>;
    canExecute(): boolean;
    reset(): void;
  }

  class RateLimiter {
    [key: string]: any;
    constructor(opts: { maxTokens: number; refillRate: number; windowMs: number });
    getStatus(): Record<string, unknown>;
    isAllowed(tokens?: number): boolean;
  }

  class StructuredLogger {
    constructor(module: string);
    info(msg: string, context?: Record<string, unknown>): void;
    warning(msg: string, context?: Record<string, unknown>): void;
    error(msg: string, context?: Record<string, unknown>): void;
  }

  class Metrics {
    [key: string]: any;
    recordTaskCompleted(name: string, durationMs: number): void;
    recordTaskFailed(name: string, reason: string, durationMs: number): void;
    recordToolCall(name: string, durationMs: number, success: boolean): void;
    getStats(): Record<string, unknown>;
  }

  class WorkflowEngine {
    [key: string]: any;
    constructor();
  }

  class OpenClawSkillAdapter {
    [key: string]: any;
    constructor(opts: { openClawSkillsPath: string; zCrystalSkillsPath: string });
  }

  class SkillSyncManager {
    [key: string]: any;
    constructor(adapter: OpenClawSkillAdapter);
  }

  class ReplayRunner {
    [key: string]: any;
    constructor();
  }

  class HookRegistry {
    [key: string]: any;
    constructor();
  }

  class DiskStore {
    [key: string]: any;
    constructor(dataPath: string);
  }

  class EvolutionStore {
    [key: string]: any;
    constructor(diskStore: DiskStore);
  }

  class TraceStore {
    [key: string]: any;
    constructor(diskStore: DiskStore);
  }

  interface Skill {
    id: string;
    slug: string;
    name: string;
    description: string;
    content: string;
    version: string;
  }

  enum TriggerType {
    MANUAL = 'manual',
    SCHEDULED = 'scheduled',
    EVENT = 'event',
    CONDITION = 'condition',
  }

  export {
    UnifiedApiRouter,
    createHonchoClient,
    createSkillManager,
    SelfEvolutionEngine,
    EvolutionCoordinator,
    EvolutionScheduler,
    ReviewEngine,
    ToolHub,
    SkillGenerator,
    SkillVersioning,
    SkillIndexer,
    SkillValidator,
    SkillMerger,
    CircuitBreaker,
    RateLimiter,
    StructuredLogger,
    Metrics,
    WorkflowEngine,
    OpenClawSkillAdapter,
    SkillSyncManager,
    ReplayRunner,
    HookRegistry,
    DiskStore,
    EvolutionStore,
    TraceStore,
    TriggerType,
    Skill,
  };
}