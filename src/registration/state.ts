/**
 * ZCrystal State Initialization
 * Extracted from register.ts — lines 489-560
 */

import {
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
} from '@zcrystal/evo';
import { config as zcrystalConfig } from '../config.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ZCrystalState {
  router: UnifiedApiRouter;
  honcho: ReturnType<typeof createHonchoClient>;
  skillManager: Awaited<ReturnType<typeof createSkillManager>>;
  selfEvolution: SelfEvolutionEngine;
  evolutionCoordinator: EvolutionCoordinator;
  evolutionScheduler?: EvolutionScheduler;
  reviewEngine: ReviewEngine;
  toolHub: ToolHub;
  skillGenerator: SkillGenerator;
  skillVersioning: SkillVersioning;
  skillIndexer: SkillIndexer;
  skillValidator: SkillValidator;
  skillMerger: SkillMerger;
  circuitBreaker: CircuitBreaker;
  rateLimiter: RateLimiter;
  logger: StructuredLogger;
  metrics: Metrics;
  workflowEngine: WorkflowEngine;
  skillAdapter: OpenClawSkillAdapter;
  skillSyncManager: SkillSyncManager;
  replayRunner: ReplayRunner;
  hookRegistry: HookRegistry;
  traceStore: TraceStore;
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export let zcState: ZCrystalState | null = null;

export function isZcStateAvailable(): boolean {
  return zcState !== null;
}

export function getZcState(): ZCrystalState | null {
  return zcState;
}

// ─── Initialization ───────────────────────────────────────────────────────────

export function initializeZcState(): ZCrystalState | null {
  const router = new UnifiedApiRouter();
  const honcho = createHonchoClient({ baseUrl: 'http://localhost:8000', workspace: 'openclaw' });
  const skillManagerZCrystal = createSkillManager(zcrystalConfig.paths.skills);

  const diskStore = new DiskStore(zcrystalConfig.paths.temp);
  const evolutionStore = new EvolutionStore(diskStore);
  const traceStore = new TraceStore(diskStore);
  const selfEvolution = new SelfEvolutionEngine(evolutionStore, traceStore);

  const toolHub = new ToolHub();
  const skillGenerator = new SkillGenerator();
  const circuitBreaker = new CircuitBreaker({ failureThreshold: 5, successThreshold: 2, timeout: 60000 });
  const rateLimiter = new RateLimiter({ maxTokens: 100, refillRate: 10, windowMs: 60000 });
  const logger = new StructuredLogger('ZCrystal');
  const metrics = new Metrics();
  const workflowEngine = new WorkflowEngine();
  const skillAdapter = new OpenClawSkillAdapter({
    openClawSkillsPath: zcrystalConfig.paths.skills,
    zCrystalSkillsPath: zcrystalConfig.paths.data + '/skills',
  });
  const skillSyncManager = new SkillSyncManager(skillAdapter);
  const replayRunner = new ReplayRunner();
  const hookRegistry = new HookRegistry();
  const skillVersioning = new SkillVersioning();
  const skillIndexer = new SkillIndexer();
  const skillValidator = new SkillValidator();
  const skillMerger = new SkillMerger();
  const reviewEngine = new ReviewEngine();
  const evolutionCoordinator = new EvolutionCoordinator(evolutionStore, traceStore);

  const getSkills = async () => {
    try {
      if (zcState?.skillManager) {
        const result = await (zcState.skillManager as any).discover();
        if (result?.ok && result.data) {
          return result.data.map((s: any) => ({
            slug: s.slug || s.id || '',
            content: s.content || '',
          }));
        }
      }
    } catch { /* ignore */ }
    return [];
  };

  const evolutionScheduler = new EvolutionScheduler(evolutionCoordinator, getSkills, 60 * 60 * 1000);

  return {
    router,
    honcho,
    skillManager: skillManagerZCrystal as any,
    selfEvolution,
    evolutionCoordinator,
    evolutionScheduler,
    reviewEngine,
    toolHub,
    skillGenerator,
    skillVersioning,
    skillIndexer,
    skillValidator,
    skillMerger,
    circuitBreaker,
    rateLimiter,
    logger,
    metrics,
    workflowEngine,
    skillAdapter,
    skillSyncManager,
    replayRunner,
    hookRegistry,
    traceStore,
  };
}

export function startEvolutionScheduler(state: ZCrystalState): void {
  try {
    state.evolutionScheduler?.start();
    console.log('[Claw_Core+ZCrystal] Auto-evolution scheduler started (1 hour interval)');
  } catch (err) {
    console.warn('[Claw_Core+ZCrystal] Failed to start evolution scheduler:', err);
  }
}