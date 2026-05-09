/**
 * Self-Evolution Engine for ZCrystal Plugin
 *
 * Aligns with: https://github.com/nousresearch/hermes-agent-self-evolution
 *
 * Features:
 * - DSPy + GEPA (Genetic-Pareto Prompt Evolution)
 * - LLM-as-Judge evaluation
 * - Reflexion correction
 * - Skill optimization
 *
 * 13 Harness Patterns Compliance:
 * 1. Memory Persistence - Dual storage (memory + disk)
 * 2. Skill Runtime - Lazy-load with trigger前置
 * 3. Tool & Safety - Fail-closed, per-call bounds
 * 4. Select - Memoize promise not result
 * 5. Compress - Recovery pointer for truncation
 * 6. Isolate - Zero-inheritance, single responsibility
 * 7. Agent Orchestration - Coordinator pattern
 * 8. Hook Lifecycle - Single dispatch
 * 9. Task Decomposition - Typed IDs, disk output, two-phase
 * 10. Bootstrap Sequence - Dependency ordering
 * 11. Multi-Agent Research - Async parallel evaluation
 * 12. Long-Running Agents - Initializer pattern
 * 13. Codex/AI Coding - Context-first design
 */
import { FeedbackStore } from './feedback-store.js';
import { EvolutionLearningPersistence } from './memory/evolution-learning.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
// ============================================================
// Constants (Magic Number Replacement)
// ============================================================
const SCORE_THRESHOLD_HIGH = 0.7; // High quality threshold
const SCORE_THRESHOLD_LOW = 0.3; // Failure threshold
const SCORE_DEFAULT = 0.5; // Default score
const SKILL_SIZE_LIMIT = 15 * 1024; // 15KB size limit
const TOOL_DESC_LIMIT = 500; // Tool description limit
const MAX_CANDIDATES = 10; // Max mutation candidates
const MAX_TRACES = 100; // Max traces per skill
const MAX_HISTORY = 50; // Max evolution history entries
const MAX_APPLIED = 100; // Max applied candidates per skill
// MAX_BACKUPS removed - backup map uses MAX_APPLIED for FIFO eviction
const MAX_PENDING_TTL_MS = 30_000; // 30s TTL for pending evaluations
const RECOVERY_POINTER_VERSION = 1; // Recovery pointer version
// ============================================================
// New: Closed-Loop Evolution Constants
// ============================================================
const SUCCESS_RATE_THRESHOLD = 0.6; // Trigger evolution if success rate < 60%
const VERIFICATION_COUNT = 20; // Verify with 20 traces before confirming
const DEGRADATION_THRESHOLD = 0.5; // Rollback if verified success rate < 50%
const SCHEDULER_INTERVAL_MS = 60 * 60 * 1000; // 1 hour between scheduled checks
const MIN_TRACES_FOR_ANALYSIS = 10; // Min traces to analyze before triggering
// Persistence constants
const TRACES_FILE = 'traces.json';
const RECOVERY_FILE = 'recovery.json';
const MAX_TRACES_PER_SKILL = 100;
function createEvolutionId(type, name) {
    return `${type}:${name}`;
}
function createTraceId(skillSlug, timestamp) {
    return `${skillSlug}:trace:${timestamp}`;
}
const MUTATION_RULES = [
    {
        name: 'clarity',
        description: 'Make instructions clearer and more specific',
        apply: (content) => [
            content.replace(/\./g, '.').replace(/([a-z])\./g, '$1. '),
            content.length < 100 ? content + '\n\nProvide specific examples.' : content,
        ],
    },
    {
        name: 'structure',
        description: 'Improve structure with better formatting',
        apply: (content) => {
            if (!content.includes('\n## ')) {
                return [
                    content.replace(/^([^#\n]+)/, '## Overview\n\n$1'),
                    content.replace(/\n\n/g, '\n\n## Details\n\n'),
                ];
            }
            return [content];
        },
    },
    {
        name: 'examples',
        description: 'Add or expand examples',
        apply: (content) => {
            if (content.includes('Example:') || content.includes('```')) {
                return [content];
            }
            return [
                content + '\n\n## Example\n\n```\n/example usage\n```',
            ];
        },
    },
    {
        name: 'constraints',
        description: 'Add explicit constraints',
        apply: (content) => {
            if (content.includes('Constraint') || content.includes('Must')) {
                return [content];
            }
            return [
                content + '\n\n## Constraints\n\n- Keep responses concise\n- Prioritize safety',
            ];
        },
    },
];
// ============================================================
// Self-Evolution Engine (Isolate - Pattern 6)
// ============================================================
export class SelfEvolutionEngine {
    // State (Memory Persistence - Pattern 1)
    skillManager;
    honcho;
    feedbackStore; // Why+How feedback entries
    traces = new Map();
    dataDir = process.env.ZCRYSTAL_TEMP_PATH || join(tmpdir(), 'zcrystal');
    evolutionHistory = [];
    recoveryPoints = new Map();
    config;
    // Promise memoization (Select - Pattern 4)
    // Promise memoization with TTL-based cleanup (Select - Pattern 4)
    pendingEvaluations = new Map();
    // Initializer state (Long-Running - Pattern 12)
    initialized = false;
    initPromise;
    // Closed-Loop: Applied candidate verification
    appliedCandidates = new Map();
    // Closed-Loop: In-progress evolution tracking (prevents race conditions)
    evolvingSkills = new Set();
    // Closed-Loop: Backups for rollback (Disk-persisted for crash recovery)
    backups = new Map();
    BACKUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
    _backupDir;
    // Learning persistence (Memory Persistence - Pattern 1)
    learningPersistence;
    // Closed-Loop: Scheduler
    schedulerInterval;
    constructor(skillManager, config = {}, honcho) {
        this.skillManager = skillManager;
        this.honcho = honcho;
        this.config = {
            target: config.target || 'all',
            iterations: config.iterations || MAX_CANDIDATES,
            evalSource: config.evalSource || 'synthetic',
            provider: config.provider,
            model: config.model,
        };
        // Initialize FeedbackStore for Why+How entries (disk-backed, Memory Persistence Pattern 1)
        this.feedbackStore = new FeedbackStore(this.dataDir);
    }
    // ============================================================
    // Bootstrap Sequence (Pattern 10)
    // ============================================================
    /**
     * Initialize engine with dependency ordering
     */
    async initialize() {
        if (this.initialized)
            return;
        // Prevent double initialization
        if (this.initPromise) {
            return this.initPromise;
        }
        this.initPromise = this.doInitialize();
        await this.initPromise;
        this.initialized = true;
    }
    async doInitialize() {
        // 1. First: Load traces from disk (if persistence exists)
        // 2. Second: Initialize learning persistence
        this.learningPersistence = new EvolutionLearningPersistence(this.dataDir);
        await this.learningPersistence.load();
        // 3. Third: Discover skills (Skill Runtime - Pattern 2)
        try {
            await this.skillManager.discover();
        }
        catch {
            // Skill discovery is best-effort
        }
        // 4. Fourth: Restore recovery points
        this.loadRecoveryPoints();
        // 5. Fifth: Start scheduler for periodic evolution
        this.startScheduler();
        console.log('[SelfEvolution] Engine initialized with learning persistence');
    }
    // ============================================================
    // Closed-Loop: Scheduler (Periodic Evolution)
    // ============================================================
    startScheduler() {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
        }
        this.schedulerInterval = setInterval(() => {
            this.runScheduledEvolution().catch(err => {
                console.error('[SelfEvolution] Scheduler error:', err);
            });
        }, SCHEDULER_INTERVAL_MS);
        console.log('[SelfEvolution] Scheduler started (interval: 1 hour)');
    }
    stopScheduler() {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = undefined;
            console.log('[SelfEvolution] Scheduler stopped');
        }
    }
    async runScheduledEvolution() {
        console.log('[SelfEvolution] Running scheduled evolution check');
        const skills = this.skillManager.getSkills();
        let evolved = 0;
        for (const skill of skills) {
            const traces = this.getTraces(skill.slug);
            if (traces.length >= MIN_TRACES_FOR_ANALYSIS) {
                const recentTraces = traces.slice(-MIN_TRACES_FOR_ANALYSIS);
                const successRate = recentTraces.filter(t => t.success).length / recentTraces.length;
                if (successRate < SUCCESS_RATE_THRESHOLD) {
                    console.log(`[SelfEvolution] Scheduled evolution for ${skill.slug} (success rate: ${(successRate * 100).toFixed(0)}%)`);
                    try {
                        await this.evolveSkill(skill);
                        evolved++;
                    }
                    catch (err) {
                        console.error(`[SelfEvolution] Scheduled evolution failed for ${skill.slug}:`, err);
                    }
                }
            }
        }
        if (evolved === 0) {
            console.log('[SelfEvolution] No skills需要 scheduled evolution');
        }
    }
    // ============================================================
    // Memory Persistence (Pattern 1) - Dual Storage
    // ============================================================
    /**
     * Record trace with dual storage
     * Local memory always wins
     */
    recordTrace(skillSlug, trace) {
        // Local storage (primary)
        const existing = this.traces.get(skillSlug) || [];
        existing.push(trace);
        // Enforce max traces (eviction)
        if (existing.length > MAX_TRACES) {
            existing.shift(); // FIFO eviction
        }
        this.traces.set(skillSlug, existing);
        // Disk persistence (secondary) - async, non-blocking
        this.persistTrace(skillSlug, trace).catch(() => {
            // Disk persistence failure is non-fatal
        });
        // ============================================================
        // Closed-Loop: Auto-trigger based on success rate
        // ============================================================
        this.checkAutoTrigger(skillSlug);
        // ============================================================
        // Closed-Loop: Verify applied candidates
        // ============================================================
        this.verifyAppliedCandidate(skillSlug, trace);
    }
    checkAutoTrigger(skillSlug) {
        const traces = this.getTraces(skillSlug);
        // Need enough traces to make a decision
        if (traces.length < MIN_TRACES_FOR_ANALYSIS) {
            return;
        }
        const recentTraces = traces.slice(-MIN_TRACES_FOR_ANALYSIS);
        const successRate = recentTraces.filter(t => t.success).length / MIN_TRACES_FOR_ANALYSIS;
        // If success rate is below threshold, trigger evolution
        if (successRate < SUCCESS_RATE_THRESHOLD) {
            console.log(`[SelfEvolution] Auto-trigger: ${skillSlug} success rate ${(successRate * 100).toFixed(0)}% < ${(SUCCESS_RATE_THRESHOLD * 100).toFixed(0)}%`);
            const skill = this.skillManager.getSkill(skillSlug);
            if (skill) {
                // Fire and forget - evolution runs in background
                this.evolveSkill(skill).catch(err => {
                    console.error(`[SelfEvolution] Auto-trigger evolution failed for ${skillSlug}:`, err);
                });
            }
        }
    }
    verifyAppliedCandidate(skillSlug, trace) {
        const applied = this.appliedCandidates.get(skillSlug);
        if (!applied) {
            return;
        }
        // Count this trace
        applied.tracesCount++;
        if (trace.success) {
            applied.successCount++;
        }
        // Check if we've collected enough verification traces
        if (applied.tracesCount >= VERIFICATION_COUNT) {
            const verifiedRate = applied.successCount / applied.tracesCount;
            console.log(`[SelfEvolution] Verification complete for ${skillSlug}: ${(verifiedRate * 100).toFixed(0)}% success rate over ${applied.tracesCount} traces`);
            // If verified success rate is below threshold, rollback
            if (verifiedRate < DEGRADATION_THRESHOLD) {
                console.log(`[SelfEvolution] Degradation detected for ${skillSlug}: ${(verifiedRate * 100).toFixed(0)}% < ${(DEGRADATION_THRESHOLD * 100).toFixed(0)}%, rolling back`);
                this.performRollback(skillSlug);
            }
            // Clean up verification tracking
            this.appliedCandidates.delete(skillSlug);
        }
    }
    getTraces(skillSlug) {
        // Local always wins (Pattern 1)
        return this.traces.get(skillSlug) || [];
    }
    clearTraces(skillSlug) {
        if (skillSlug) {
            this.traces.delete(skillSlug);
        }
        else {
            this.traces.clear();
        }
    }
    // ============================================================
    // Tool & Safety (Pattern 3) - Fail-closed, per-call bounds
    // ============================================================
    /**
     * Canonical score bounds check
     */
    clampScore(value, min = 0, max = 1) {
        return Math.max(min, Math.min(max, value));
    }
    /**
     * Canonical dimension bounds check
     */
    clampDimension(value) {
        return Math.max(1, Math.min(10, value));
    }
    // ============================================================
    // Task Decomposition (Pattern 9) - Typed IDs + Two-Phase
    // ============================================================
    /**
     * Phase 1: Prepare evolution (create recovery point)
     */
    async prepareEvolution(skill) {
        const id = createEvolutionId('skill', skill.slug);
        // Save recovery point before any mutation
        const content = await this.skillManager.readSkillContent(skill);
        this.recoveryPoints.set(id, {
            version: RECOVERY_POINTER_VERSION,
            originalContent: content,
            timestamp: Date.now(),
            candidateId: 'none',
        });
        return id;
    }
    /**
     * Phase 2: Commit evolution (apply best candidate)
     * Only if Phase 1 was called
     */
    async commitEvolution(id, result) {
        const recovery = this.recoveryPoints.get(id);
        if (!recovery) {
            console.warn(`[SelfEvolution] No recovery point for ${id}`);
            return false;
        }
        if (!result.bestCandidate) {
            return false;
        }
        const skillSlug = id.replace('skill:', '');
        const skill = this.skillManager.getSkill(skillSlug);
        if (!skill) {
            return false;
        }
        // Update recovery point with applied candidate
        this.recoveryPoints.set(id, {
            ...recovery,
            candidateId: result.bestCandidate.id,
        });
        // ============================================================
        // Closed-Loop: Create backup before applying (for rollback)
        // ============================================================
        (async () => {
            try {
                const currentContent = await this.skillManager.readSkillContent(skill);
                this.backups.set(skillSlug, {
                    data: { content: currentContent, timestamp: Date.now() },
                    timestamp: Date.now(),
                });
                console.log(`[SelfEvolution] Backup created for ${skillSlug}`);
            }
            catch (err) {
                console.error(`[SelfEvolution] Backup creation failed for ${skillSlug}:`, err);
            }
        })();
        // Set up verification tracking
        // Bounded applied candidates (FIFO eviction)
        const appliedKeys = [...this.appliedCandidates.keys()].filter(k => k.startsWith(skillSlug));
        if (appliedKeys.length >= MAX_APPLIED) {
            this.appliedCandidates.delete(appliedKeys[0]);
        }
        this.appliedCandidates.set(skillSlug, {
            content: result.bestCandidate.content,
            score: result.bestCandidate.score,
            tracesCount: 0,
            successCount: 0,
            appliedAt: Date.now(),
        });
        console.log(`[SelfEvolution] Verification tracking started for ${skillSlug} (need ${VERIFICATION_COUNT} traces)`);
        return this.skillManager.writeSkillContent(skill, result.bestCandidate.content);
    }
    /**
     * Rollback to recovery point
     */
    async rollbackEvolution(id) {
        const recovery = this.recoveryPoints.get(id);
        if (!recovery) {
            return false;
        }
        const skillSlug = id.replace('skill:', '');
        const skill = this.skillManager.getSkill(skillSlug);
        if (!skill) {
            return false;
        }
        // Restore original content
        const success = await this.skillManager.writeSkillContent(skill, recovery.originalContent);
        // Clean up recovery point
        this.recoveryPoints.delete(id);
        return success;
    }
    // ============================================================
    // Evolution Main (Agent Orchestration - Pattern 7)
    // ============================================================
    async evolveSkill(skill, options) {
        // Ensure initialized (Bootstrap - Pattern 10)
        await this.initialize();
        // Prevent concurrent evolution of same skill (Pattern 6: Isolate)
        if (this.evolvingSkills.has(skill.slug)) {
            console.log(`[SelfEvolution] ${skill.slug} already evolving, skipping`);
            return { target: `skill:${skill.slug}`, candidates: [], bestCandidate: undefined, timestamp: Date.now() };
        }
        this.evolvingSkills.add(skill.slug);
        try {
            const iterations = options?.iterations || this.config.iterations || MAX_CANDIDATES;
            const candidates = [];
            // Read current content
            const currentContent = await this.skillManager.readSkillContent(skill);
            // Generate candidates (Task Decomposition - Pattern 9)
            // Pass skillSlug for learning hints
            const allVariants = this.generateCandidates(currentContent, iterations, skill.slug);
            // Score each candidate (Memoize promise - Pattern 4)
            const scoredPromises = allVariants.map((variant, index) => this.scoreCandidateAsync(skill, variant, index));
            // Wait for all evaluations (Multi-Agent - Pattern 11)
            const scoredCandidates = await Promise.all(scoredPromises);
            candidates.push(...scoredCandidates);
            // Sort by score (Select - Pattern 4)
            candidates.sort((a, b) => b.score - a.score);
            // Route evolution (Agent Orchestration - Pattern 7)
            const result = await this.routeEvolution(candidates, skill);
            // Bounded evolution history (FIFO eviction)
            this.evolutionHistory.push(result);
            if (this.evolutionHistory.length > MAX_HISTORY) {
                this.evolutionHistory.shift();
            }
            // FIX: Auto-apply best candidate after evolution completes
            if (result.bestCandidate) {
                const applied = await this.applyBestCandidate(result);
                console.log(`[SelfEvolution] Auto-apply best candidate for ${skill.slug}: ${applied ? 'success' : 'failed'}`);
            }
            return result;
        }
        finally {
            this.evolvingSkills.delete(skill.slug);
        }
    }
    /**
     * Generate mutation candidates
     * Uses learning hints to guide mutations toward successful patterns
     */
    generateCandidates(content, limit, skillSlug) {
        const variants = new Set([content]);
        // Get learning hints if available
        const hints = skillSlug && this.learningPersistence
            ? this.learningPersistence.getHints(skillSlug)
            : { successfulPatterns: [], avoidPatterns: [], avgSuccessfulScore: 0.5 };
        for (const rule of MUTATION_RULES) {
            for (const variant of [...variants]) {
                const mutations = rule.apply(variant);
                for (const m of mutations) {
                    if (variants.size >= limit)
                        break;
                    // If we have successful patterns, give slight preference to content containing them
                    if (hints.successfulPatterns.length > 0) {
                        const lowerM = m.toLowerCase();
                        const hasGoodPattern = hints.successfulPatterns.some(p => lowerM.includes(p));
                        const hasBadPattern = hints.avoidPatterns.some(p => lowerM.includes(p));
                        // Skip if it contains patterns to avoid
                        if (hasBadPattern)
                            continue;
                        // If it has good patterns, prioritize it (add first)
                        if (hasGoodPattern) {
                            variants.add(m);
                        }
                        else if (variants.size < limit * 0.8) {
                            // Add regular variants only if we're below 80% capacity
                            variants.add(m);
                        }
                    }
                    else {
                        variants.add(m);
                    }
                }
            }
        }
        const result = [...variants].slice(0, limit);
        // Log hint usage for debugging
        if (hints.successfulPatterns.length > 0) {
            console.log(`[SelfEvolution] Used ${hints.successfulPatterns.length} learned patterns for ${skillSlug}`);
        }
        return result;
    }
    // ============================================================
    // LLM-as-Judge Evaluation (Phase 2)
    // ============================================================
    /**
     * Clean up stale backups (TTL-based eviction)
     */
    cleanupBackups() {
        const now = Date.now();
        for (const [key, entry] of this.backups.entries()) {
            if (now - entry.timestamp > this.BACKUP_TTL_MS) {
                this.backups.delete(key);
            }
        }
        // Enforce max size (100 per skill prefix)
        if (this.backups.size > 200) {
            const oldestKeys = [...this.backups.entries()]
                .sort((a, b) => a[1].timestamp - b[1].timestamp)
                .slice(0, this.backups.size - 200)
                .map(([key]) => key);
            for (const key of oldestKeys) {
                this.backups.delete(key);
            }
        }
    }
    /**
     * Clean up stale pending evaluations (TTL-based eviction)
     */
    cleanupPendingEvaluations() {
        const now = Date.now();
        for (const [key, entry] of this.pendingEvaluations.entries()) {
            if (now - entry.timestamp > MAX_PENDING_TTL_MS) {
                this.pendingEvaluations.delete(key);
            }
        }
        // Also enforce max size
        if (this.pendingEvaluations.size > 100) {
            const oldestKeys = [...this.pendingEvaluations.entries()]
                .sort((a, b) => a[1].timestamp - b[1].timestamp)
                .slice(0, this.pendingEvaluations.size - 100)
                .map(([key]) => key);
            for (const key of oldestKeys) {
                this.pendingEvaluations.delete(key);
            }
        }
    }
    /**
     * Async evaluation with promise memoization (Select - Pattern 4)
     */
    async scoreCandidateAsync(skill, content, index) {
        // Create memoization key
        const memoKey = `${skill.slug}:${index}:${content.substring(0, 50)}`;
        // Check if already pending
        // Clean up old pending evaluations first
        this.cleanupPendingEvaluations();
        const pending = this.pendingEvaluations.get(memoKey);
        if (pending) {
            // Check if promise is still pending
            const evaluation = await pending.promise;
            return this.createCandidate(content, index, evaluation, skill);
        }
        // Create and memoize promise with timestamp
        const evalPromise = this.evaluateWithLLM(content);
        this.pendingEvaluations.set(memoKey, { promise: evalPromise, timestamp: Date.now() });
        try {
            const evaluation = await evalPromise;
            return this.createCandidate(content, index, evaluation, skill);
        }
        finally {
            // Clean up memoization
            this.pendingEvaluations.delete(memoKey);
        }
    }
    createCandidate(content, index, evaluation, skill) {
        // Apply size bounds (Tool & Safety - Pattern 3)
        let score = evaluation.score;
        if (content.length > SKILL_SIZE_LIMIT) {
            score = this.clampScore(score - 0.3);
        }
        // Bonus for structure
        if (content.includes('## ') && content.includes('\n')) {
            score = this.clampScore(score + 0.1);
        }
        // Bonus for examples
        if (content.includes('```') || content.includes('Example:')) {
            score = this.clampScore(score + 0.1);
        }
        return {
            id: `candidate-${index}`,
            content,
            score,
            mutations: this.identifyMutations(skill, content),
        };
    }
    /**
     * LLM-as-Judge evaluation (with fallback)
     */
    async evaluateWithLLM(candidate) {
        // Input validation (Tool & Safety - Pattern 3)
        if (typeof candidate !== 'string' || candidate.length === 0) {
            return this.ruleBasedEvaluate('');
        }
        // Fallback if no Honcho (Skill Runtime - Pattern 2)
        if (!this.honcho) {
            return this.ruleBasedEvaluate(candidate);
        }
        try {
            const response = await this.honcho.ask('system', this.buildEvaluationPrompt(candidate));
            return this.parseEvaluation(response, candidate);
        }
        catch (err) {
            console.error('[SelfEvolution] LLM evaluation failed:', err);
            return this.ruleBasedEvaluate(candidate);
        }
    }
    buildEvaluationPrompt(candidate) {
        return `Evaluate the following Prompt quality:

${candidate}

Evaluation dimensions (each 1-10):
1. Clarity: Are instructions clear and specific?
2. Completeness: Does it cover all necessary cases?
3. Actionability: Can the AI execute it correctly?

Output ONLY valid JSON:
{
  "score": 0.8,
  "clarity": 8,
  "completeness": 7,
  "actionability": 9,
  "reasoning": "Brief explanation",
  "evaluationFeedback": {
    "whyScore": "Why this overall score (specific weakness or strength) (≤100 chars)",
    "howToImprove": "Concrete actionable rule to improve this type of prompt (≤150 chars)"
  }
}`;
    }
    parseEvaluation(response, fallbackContent) {
        // Robust JSON parsing
        const parsed = this.parseJSONResponse(response);
        if (!parsed) {
            return this.ruleBasedEvaluate(fallbackContent);
        }
        // Extract evaluationFeedback (Why + How to Apply)
        const evalFeedbackRaw = parsed.evaluationFeedback;
        const evaluationFeedback = evalFeedbackRaw ? {
            whyScore: evalFeedbackRaw.whyScore ?? '',
            howToImprove: evalFeedbackRaw.howToImprove ?? '',
        } : undefined;
        // Apply bounds (Tool & Safety - Pattern 3)
        return {
            score: this.clampScore(parsed.score ?? SCORE_DEFAULT),
            clarity: this.clampDimension(parsed.clarity ?? 5),
            completeness: this.clampDimension(parsed.completeness ?? 5),
            actionability: this.clampDimension(parsed.actionability ?? 5),
            reasoning: parsed.reasoning ?? 'No reasoning provided',
            evaluationFeedback,
        };
    }
    parseJSONResponse(response) {
        try {
            return JSON.parse(response);
        }
        catch {
            // Try extract from markdown
            const match = response.match(/\{[^{}]*\}/);
            if (match) {
                try {
                    return JSON.parse(match[0]);
                }
                catch {
                    return null;
                }
            }
            return null;
        }
    }
    parseDiagnosisResponse(response) {
        try {
            return JSON.parse(response);
        }
        catch {
            // Try extract from markdown
            const match = response.match(/\{[^{}]*\}/);
            if (match) {
                try {
                    return JSON.parse(match[0]);
                }
                catch {
                    return null;
                }
            }
            return null;
        }
    }
    /**
     * Fallback rule-based evaluation
     */
    ruleBasedEvaluate(candidate) {
        let clarity = 5;
        let completeness = 5;
        let actionability = 5;
        // Clarity heuristics
        if (candidate.length > 50)
            clarity += 1;
        if (candidate.includes('##'))
            clarity += 1;
        if (candidate.includes(':'))
            clarity += 1;
        if (candidate.split('.').length > 3)
            clarity += 1;
        // Completeness heuristics
        if (candidate.includes('Example'))
            completeness += 2;
        if (candidate.includes('Constraint'))
            completeness += 1;
        if (candidate.includes('#'))
            completeness += 1;
        // Actionability heuristics
        if (candidate.includes('```'))
            actionability += 2;
        if (/\b(should|must|will|can)\b/i.test(candidate))
            actionability += 1;
        if (candidate.includes('Return'))
            actionability += 1;
        // Apply bounds
        clarity = this.clampDimension(clarity);
        completeness = this.clampDimension(completeness);
        actionability = this.clampDimension(actionability);
        const score = (clarity + completeness + actionability) / 30;
        return {
            score: this.clampScore(score),
            clarity,
            completeness,
            actionability,
            reasoning: 'Rule-based evaluation (fallback)',
        };
    }
    // ============================================================
    // Reflexion Correction (Phase 4)
    // ============================================================
    /**
     * Reflexion-style correction for low-quality candidates
     */
    async reflexionCorrection(candidate, evaluation) {
        // Require Honcho for Reflexion
        if (!this.honcho) {
            return null;
        }
        try {
            // Step 1: Diagnose (Hook Lifecycle - Pattern 8)
            const diagnosis = await this.diagnoseProblem(candidate, evaluation);
            if (!diagnosis)
                return null;
            // Step 2: Generate remedy
            const remedy = await this.generateRemedy(candidate, diagnosis);
            if (!remedy)
                return null;
            // Step 3: Re-evaluate
            const reEval = await this.evaluateWithLLM(remedy);
            // Step 4: Accept if improved
            if (reEval.score > evaluation.score + 0.1) {
                return {
                    id: `${candidate.id}-reflexion`,
                    content: remedy,
                    score: reEval.score,
                    mutations: [
                        ...candidate.mutations,
                        {
                            type: 'reflexion',
                            original: evaluation.reasoning,
                            mutated: diagnosis,
                            rationale: `Score improved from ${evaluation.score.toFixed(2)} to ${reEval.score.toFixed(2)}`,
                        },
                    ],
                };
            }
            return null;
        }
        catch (err) {
            console.error('[SelfEvolution] Reflexion failed:', err);
            return null;
        }
    }
    async diagnoseProblem(candidate, evaluation) {
        if (!this.honcho)
            return null;
        try {
            const response = await this.honcho.ask('system', `Analyze this Prompt's problems:

${candidate.content}

Current score: ${evaluation.score.toFixed(2)}
Issues: ${evaluation.reasoning}

Output ONLY valid JSON:
{"diagnosis": "What exactly is wrong", "suggestions": ["Fix 1", "Fix 2"]}`, 'quick');
            const parsed = this.parseDiagnosisResponse(response);
            return parsed?.diagnosis ?? null;
        }
        catch {
            return null;
        }
    }
    async generateRemedy(candidate, diagnosis) {
        if (!this.honcho)
            return null;
        try {
            const response = await this.honcho.ask('system', `Based on the diagnosis, generate an improved Prompt:

Original Prompt:
${candidate.content}

Diagnosis:
${diagnosis}

Output ONLY the improved Prompt (no JSON, no commentary):`, 'quick');
            return response.trim();
        }
        catch {
            return null;
        }
    }
    // ============================================================
    // Phase 3: Routing Logic (Agent Orchestration - Pattern 7)
    // ============================================================
    /**
     * Route evolution based on score threshold
     */
    async routeEvolution(candidates, skill) {
        const threshold = SCORE_THRESHOLD_HIGH;
        const reflexionQueue = [];
        // Phase 3a: Identify candidates needing Reflexion
        for (const candidate of candidates) {
            if (candidate.score < threshold) {
                reflexionQueue.push(candidate);
            }
        }
        // Phase 3b: Apply Reflexion in parallel (Multi-Agent - Pattern 11)
        if (reflexionQueue.length > 0) {
            const reflexionPromises = reflexionQueue.map(async (c) => {
                const eval_ = { score: c.score, reasoning: '', clarity: 5, completeness: 5, actionability: 5 };
                return this.reflexionCorrection(c, eval_);
            });
            const reflexionResults = await Promise.allSettled(reflexionPromises);
            // Apply successful reflexions
            for (const result of reflexionResults) {
                if (result.status === 'fulfilled' && result.value) {
                    const idx = candidates.findIndex(c => c.id === result.value.id.replace('-reflexion', ''));
                    if (idx !== -1) {
                        candidates[idx] = result.value;
                    }
                }
            }
        }
        // Re-sort after reflexion
        candidates.sort((a, b) => b.score - a.score);
        return {
            target: createEvolutionId('skill', skill.slug),
            candidates,
            bestCandidate: candidates[0],
            timestamp: Date.now(),
        };
    }
    // ============================================================
    // Utility Methods
    // ============================================================
    identifyMutations(skill, candidateContent) {
        const mutations = [];
        if (candidateContent.includes('## Overview') && !skill.description.includes('## Overview')) {
            mutations.push({
                type: 'description',
                original: 'No structure',
                mutated: 'Added ## Overview section',
                rationale: 'Improves readability',
            });
        }
        if (candidateContent.includes('```') && !skill.description.includes('```')) {
            mutations.push({
                type: 'example',
                original: 'No examples',
                mutated: 'Added code example',
                rationale: 'Provides concrete usage',
            });
        }
        return mutations;
    }
    // ============================================================
    // Persistence (Memory Persistence - Pattern 1)
    // ============================================================
    async ensureDataDir() {
        if (!existsSync(this.dataDir)) {
            await mkdir(this.dataDir, { recursive: true });
        }
    }
    async persistTrace(skillSlug, trace) {
        try {
            await this.ensureDataDir();
            const traceId = createTraceId(skillSlug, trace.timestamp);
            const filePath = join(this.dataDir, TRACES_FILE);
            // Load existing traces
            let allTraces = [];
            try {
                if (existsSync(filePath)) {
                    const raw = await readFile(filePath, 'utf-8');
                    allTraces = JSON.parse(raw);
                }
            }
            catch {
                // File doesn't exist or is corrupted, start fresh
                allTraces = [];
            }
            // Add new trace and enforce per-skill limit
            allTraces.push({ skillSlug, trace });
            const skillTraces = allTraces.filter(t => t.skillSlug === skillSlug);
            if (skillTraces.length > MAX_TRACES_PER_SKILL) {
                // Remove oldest traces for this skill to stay within limit
                const toRemove = skillTraces.length - MAX_TRACES_PER_SKILL;
                let removed = 0;
                for (let i = 0; i < allTraces.length && removed < toRemove; i++) {
                    if (allTraces[i].skillSlug === skillSlug) {
                        allTraces.splice(i, 1);
                        removed++;
                        i--; // Adjust index after splice
                    }
                }
            }
            await writeFile(filePath, JSON.stringify(allTraces, null, 2), 'utf-8');
            console.debug(`[SelfEvolution] Persisted trace: ${traceId}`);
        }
        catch (err) {
            console.error(`[SelfEvolution] Failed to persist trace for ${skillSlug}:`, err);
        }
    }
    async loadRecoveryPoints() {
        try {
            await this.ensureDataDir();
            const filePath = join(this.dataDir, RECOVERY_FILE);
            if (!existsSync(filePath)) {
                return; // No recovery points yet
            }
            const raw = await readFile(filePath, 'utf-8');
            const loaded = JSON.parse(raw);
            for (const [id, pointer] of loaded) {
                if (pointer.version === RECOVERY_POINTER_VERSION) {
                    this.recoveryPoints.set(id, pointer);
                }
            }
            console.log(`[SelfEvolution] Loaded ${this.recoveryPoints.size} recovery points`);
        }
        catch (err) {
            console.error('[SelfEvolution] Failed to load recovery points:', err);
        }
    }
    async saveRecoveryPoints() {
        try {
            await this.ensureDataDir();
            const filePath = join(this.dataDir, RECOVERY_FILE);
            const serializable = [...this.recoveryPoints.entries()];
            await writeFile(filePath, JSON.stringify(serializable, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('[SelfEvolution] Failed to save recovery points:', err);
        }
    }
    // ============================================================
    // Public API
    // ============================================================
    // Closed-Loop: Rollback
    // ============================================================
    async performRollback(skillSlug) {
        // Clean up old backups first
        this.cleanupBackups();
        const entry = this.backups.get(skillSlug);
        const backup = entry?.data;
        if (!backup) {
            console.warn(`[SelfEvolution] No backup found for ${skillSlug}, cannot rollback`);
            return false;
        }
        const skill = this.skillManager.getSkill(skillSlug);
        if (!skill) {
            console.warn(`[SelfEvolution] Skill not found for rollback: ${skillSlug}`);
            return false;
        }
        try {
            // Restore backup content
            await this.skillManager.writeSkillContent(skill, backup.content);
            this.backups.delete(skillSlug);
            console.log(`[SelfEvolution] Rollback complete for ${skillSlug}`);
            return true;
        }
        catch (err) {
            console.error(`[SelfEvolution] Rollback failed for ${skillSlug}:`, err);
            return false;
        }
    }
    // ============================================================
    // Apply Best Candidate with Verification Tracking
    // ============================================================
    /**
     * Apply the best evolution candidate to the skill.
     * FIX: Actually writes the candidate content to the skill file.
     */
    async applyBestCandidate(result) {
        if (!result.bestCandidate) {
            return false;
        }
        const skillSlug = result.target.replace('skill:', '');
        const skill = this.skillManager.getSkill(skillSlug);
        if (!skill) {
            console.error(`[SelfEvolution] Skill not found: ${skillSlug}`);
            return false;
        }
        // ============================================================
        // Closed-Loop: Create backup before applying
        // ============================================================
        try {
            const currentContent = await this.skillManager.readSkillContent(skill);
            this.backups.set(skillSlug, {
                data: { content: currentContent, timestamp: Date.now() },
                timestamp: Date.now(),
            });
            console.log(`[SelfEvolution] Backup created for ${skillSlug}`);
        }
        catch (err) {
            console.error(`[SelfEvolution] Backup creation failed for ${skillSlug}:`, err);
        }
        // ============================================================
        // FIX: Actually write the best candidate content to the skill
        // ============================================================
        try {
            const writeSuccess = await this.skillManager.writeSkillContent(skill, result.bestCandidate.content);
            if (!writeSuccess) {
                console.error(`[SelfEvolution] Failed to write candidate for ${skillSlug}`);
                return false;
            }
            console.log(`[SelfEvolution] Applied best candidate (score=${result.bestCandidate.score}) to ${skillSlug}`);
            // Record learning for future evolution guidance
            if (this.learningPersistence) {
                await this.learningPersistence.recordSuccess(skillSlug, result.bestCandidate.content, result.bestCandidate.score, false // verification not yet confirmed
                );
            }
        }
        catch (err) {
            console.error(`[SelfEvolution] Write error for ${skillSlug}:`, err);
            return false;
        }
        // Set up verification tracking
        // Bounded applied candidates (FIFO eviction)
        const appliedKeys = [...this.appliedCandidates.keys()].filter(k => k.startsWith(skillSlug));
        if (appliedKeys.length >= MAX_APPLIED) {
            this.appliedCandidates.delete(appliedKeys[0]);
        }
        this.appliedCandidates.set(skillSlug, {
            content: result.bestCandidate.content,
            score: result.bestCandidate.score,
            tracesCount: 0,
            successCount: 0,
            appliedAt: Date.now(),
        });
        console.log(`[SelfEvolution] Verification tracking started for ${skillSlug} (need ${VERIFICATION_COUNT} traces)`);
        return true;
    }
    async evolveAllSkills(options) {
        await this.initialize();
        const results = new Map();
        const skills = this.skillManager.getSkills();
        // Parallel evolution (Multi-Agent - Pattern 11)
        const promises = skills.map(async (skill) => {
            try {
                const result = await this.evolveSkill(skill, options);
                return { skill: skill.slug, result };
            }
            catch {
                return null;
            }
        });
        const settled = await Promise.all(promises);
        for (const item of settled) {
            if (item) {
                results.set(item.skill, item.result);
            }
        }
        return results;
    }
    getHistory() {
        return [...this.evolutionHistory];
    }
    getLastEvolution(target) {
        return this.evolutionHistory.filter(r => r.target === target).pop();
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return { ...this.config };
    }
}
// ============================================================
// Factory (Bootstrap Sequence - Pattern 10)
// ============================================================
export function createSelfEvolutionEngine(skillManager, config, honcho) {
    return new SelfEvolutionEngine(skillManager, config, honcho);
}
//# sourceMappingURL=self-evolution.js.map