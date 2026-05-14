import { FeedbackStore } from './feedback-store.js';
import { EvolutionLearningPersistence } from './memory/evolution-learning.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const SCORE_THRESHOLD_HIGH = 0.7;
const SCORE_THRESHOLD_LOW = 0.3;
const SCORE_DEFAULT = 0.5;
const SKILL_SIZE_LIMIT = 15 * 1024;
const TOOL_DESC_LIMIT = 500;
const MAX_CANDIDATES = 10;
const MAX_TRACES = 100;
const MAX_HISTORY = 50;
const MAX_APPLIED = 100;
const MAX_PENDING_TTL_MS = 30_000;
const RECOVERY_POINTER_VERSION = 1;
const SUCCESS_RATE_THRESHOLD = 0.6;
const VERIFICATION_COUNT = 20;
const DEGRADATION_THRESHOLD = 0.5;
const SCHEDULER_INTERVAL_MS = 60 * 60 * 1000;
const MIN_TRACES_FOR_ANALYSIS = 10;
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
export class SelfEvolutionEngine {
    skillManager;
    honcho;
    feedbackStore;
    traces = new Map();
    dataDir = process.env.ZCRYSTAL_TEMP_PATH || join(tmpdir(), 'zcrystal');
    evolutionHistory = [];
    recoveryPoints = new Map();
    config;
    pendingEvaluations = new Map();
    initialized = false;
    initPromise;
    appliedCandidates = new Map();
    evolvingSkills = new Set();
    backups = new Map();
    BACKUP_TTL_MS = 24 * 60 * 60 * 1000;
    _backupDir;
    learningPersistence;
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
        this.feedbackStore = new FeedbackStore(this.dataDir);
    }
    async initialize() {
        if (this.initialized)
            return;
        if (this.initPromise) {
            return this.initPromise;
        }
        this.initPromise = this.doInitialize();
        await this.initPromise;
        this.initialized = true;
    }
    async doInitialize() {
        this.learningPersistence = new EvolutionLearningPersistence(this.dataDir);
        await this.learningPersistence.load();
        try {
            await this.skillManager.discover();
        }
        catch {
        }
        this.loadRecoveryPoints();
        this.startScheduler();
        console.log('[SelfEvolution] Engine initialized with learning persistence');
    }
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
    recordTrace(skillSlug, trace) {
        const existing = this.traces.get(skillSlug) || [];
        existing.push(trace);
        if (existing.length > MAX_TRACES) {
            existing.shift();
        }
        this.traces.set(skillSlug, existing);
        this.persistTrace(skillSlug, trace).catch(() => {
        });
        this.checkAutoTrigger(skillSlug);
        this.verifyAppliedCandidate(skillSlug, trace);
    }
    checkAutoTrigger(skillSlug) {
        const traces = this.getTraces(skillSlug);
        if (traces.length < MIN_TRACES_FOR_ANALYSIS) {
            return;
        }
        const recentTraces = traces.slice(-MIN_TRACES_FOR_ANALYSIS);
        const successRate = recentTraces.filter(t => t.success).length / MIN_TRACES_FOR_ANALYSIS;
        if (successRate < SUCCESS_RATE_THRESHOLD) {
            console.log(`[SelfEvolution] Auto-trigger: ${skillSlug} success rate ${(successRate * 100).toFixed(0)}% < ${(SUCCESS_RATE_THRESHOLD * 100).toFixed(0)}%`);
            const skill = this.skillManager.getSkill(skillSlug);
            if (skill) {
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
        applied.tracesCount++;
        if (trace.success) {
            applied.successCount++;
        }
        if (applied.tracesCount >= VERIFICATION_COUNT) {
            const verifiedRate = applied.successCount / applied.tracesCount;
            console.log(`[SelfEvolution] Verification complete for ${skillSlug}: ${(verifiedRate * 100).toFixed(0)}% success rate over ${applied.tracesCount} traces`);
            if (verifiedRate < DEGRADATION_THRESHOLD) {
                console.log(`[SelfEvolution] Degradation detected for ${skillSlug}: ${(verifiedRate * 100).toFixed(0)}% < ${(DEGRADATION_THRESHOLD * 100).toFixed(0)}%, rolling back`);
                this.performRollback(skillSlug);
            }
            this.appliedCandidates.delete(skillSlug);
        }
    }
    getTraces(skillSlug) {
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
    clampScore(value, min = 0, max = 1) {
        return Math.max(min, Math.min(max, value));
    }
    clampDimension(value) {
        return Math.max(1, Math.min(10, value));
    }
    async prepareEvolution(skill) {
        const id = createEvolutionId('skill', skill.slug);
        const content = await this.skillManager.readSkillContent(skill);
        this.recoveryPoints.set(id, {
            version: RECOVERY_POINTER_VERSION,
            originalContent: content,
            timestamp: Date.now(),
            candidateId: 'none',
        });
        return id;
    }
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
        this.recoveryPoints.set(id, {
            ...recovery,
            candidateId: result.bestCandidate.id,
        });
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
        const success = await this.skillManager.writeSkillContent(skill, recovery.originalContent);
        this.recoveryPoints.delete(id);
        return success;
    }
    async evolveSkill(skill, options) {
        await this.initialize();
        if (this.evolvingSkills.has(skill.slug)) {
            console.log(`[SelfEvolution] ${skill.slug} already evolving, skipping`);
            return { target: `skill:${skill.slug}`, candidates: [], bestCandidate: undefined, timestamp: Date.now() };
        }
        this.evolvingSkills.add(skill.slug);
        try {
            const iterations = options?.iterations || this.config.iterations || MAX_CANDIDATES;
            const candidates = [];
            const currentContent = await this.skillManager.readSkillContent(skill);
            const allVariants = this.generateCandidates(currentContent, iterations, skill.slug);
            const scoredPromises = allVariants.map((variant, index) => this.scoreCandidateAsync(skill, variant, index));
            const scoredCandidates = await Promise.all(scoredPromises);
            candidates.push(...scoredCandidates);
            candidates.sort((a, b) => b.score - a.score);
            const result = await this.routeEvolution(candidates, skill);
            this.evolutionHistory.push(result);
            if (this.evolutionHistory.length > MAX_HISTORY) {
                this.evolutionHistory.shift();
            }
            if (result.bestCandidate) {
                const applied = await this.applyBestCandidate(result);
                console.log(`[SelfEvolution] Auto-apply best candidate for ${skill.slug}: ${applied ? 'success' : 'failed'}`);
            }
            return result;
        }
        catch (err) {
            this.evolvingSkills.delete(skill.slug);
            throw err;
        }
        finally {
            this.evolvingSkills.delete(skill.slug);
        }
    }
    generateCandidates(content, limit, skillSlug) {
        const variants = new Set([content]);
        const hints = skillSlug && this.learningPersistence
            ? this.learningPersistence.getHints(skillSlug)
            : { successfulPatterns: [], avoidPatterns: [], avgSuccessfulScore: 0.5 };
        for (const rule of MUTATION_RULES) {
            for (const variant of [...variants]) {
                const mutations = rule.apply(variant);
                for (const m of mutations) {
                    if (variants.size >= limit)
                        break;
                    if (hints.successfulPatterns.length > 0) {
                        const lowerM = m.toLowerCase();
                        const hasGoodPattern = hints.successfulPatterns.some(p => lowerM.includes(p));
                        const hasBadPattern = hints.avoidPatterns.some(p => lowerM.includes(p));
                        if (hasBadPattern)
                            continue;
                        if (hasGoodPattern) {
                            variants.add(m);
                        }
                        else if (variants.size < limit * 0.8) {
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
        if (hints.successfulPatterns.length > 0) {
            console.log(`[SelfEvolution] Used ${hints.successfulPatterns.length} learned patterns for ${skillSlug}`);
        }
        return result;
    }
    cleanupBackups() {
        const now = Date.now();
        for (const [key, entry] of this.backups.entries()) {
            if (now - entry.timestamp > this.BACKUP_TTL_MS) {
                this.backups.delete(key);
            }
        }
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
    cleanupPendingEvaluations() {
        const now = Date.now();
        for (const [key, entry] of this.pendingEvaluations.entries()) {
            if (now - entry.timestamp > MAX_PENDING_TTL_MS) {
                this.pendingEvaluations.delete(key);
            }
        }
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
    async scoreCandidateAsync(skill, content, index) {
        const memoKey = `${skill.slug}:${index}:${content.substring(0, 50)}`;
        this.cleanupPendingEvaluations();
        const pending = this.pendingEvaluations.get(memoKey);
        if (pending) {
            const evaluation = await pending.promise;
            return this.createCandidate(content, index, evaluation, skill);
        }
        const evalPromise = this.evaluateWithLLM(content);
        this.pendingEvaluations.set(memoKey, { promise: evalPromise, timestamp: Date.now() });
        try {
            const evaluation = await evalPromise;
            return this.createCandidate(content, index, evaluation, skill);
        }
        finally {
            this.pendingEvaluations.delete(memoKey);
        }
    }
    createCandidate(content, index, evaluation, skill) {
        let score = evaluation.score;
        if (content.length > SKILL_SIZE_LIMIT) {
            score = this.clampScore(score - 0.3);
        }
        if (content.includes('## ') && content.includes('\n')) {
            score = this.clampScore(score + 0.1);
        }
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
    async evaluateWithLLM(candidate) {
        if (typeof candidate !== 'string' || candidate.length === 0) {
            return this.ruleBasedEvaluate('');
        }
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
        const parsed = this.parseJSONResponse(response);
        if (!parsed) {
            return this.ruleBasedEvaluate(fallbackContent);
        }
        const evalFeedbackRaw = parsed.evaluationFeedback;
        const evaluationFeedback = evalFeedbackRaw ? {
            whyScore: evalFeedbackRaw.whyScore ?? '',
            howToImprove: evalFeedbackRaw.howToImprove ?? '',
        } : undefined;
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
    ruleBasedEvaluate(candidate) {
        let clarity = 5;
        let completeness = 5;
        let actionability = 5;
        if (candidate.length > 50)
            clarity += 1;
        if (candidate.includes('##'))
            clarity += 1;
        if (candidate.includes(':'))
            clarity += 1;
        if (candidate.split('.').length > 3)
            clarity += 1;
        if (candidate.includes('Example'))
            completeness += 2;
        if (candidate.includes('Constraint'))
            completeness += 1;
        if (candidate.includes('#'))
            completeness += 1;
        if (candidate.includes('```'))
            actionability += 2;
        if (/\b(should|must|will|can)\b/i.test(candidate))
            actionability += 1;
        if (candidate.includes('Return'))
            actionability += 1;
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
    async reflexionCorrection(candidate, evaluation) {
        if (!this.honcho) {
            return null;
        }
        try {
            const diagnosis = await this.diagnoseProblem(candidate, evaluation);
            if (!diagnosis)
                return null;
            const remedy = await this.generateRemedy(candidate, diagnosis);
            if (!remedy)
                return null;
            const reEval = await this.evaluateWithLLM(remedy);
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
    async routeEvolution(candidates, skill) {
        const threshold = SCORE_THRESHOLD_HIGH;
        const reflexionQueue = [];
        for (const candidate of candidates) {
            if (candidate.score < threshold) {
                reflexionQueue.push(candidate);
            }
        }
        if (reflexionQueue.length > 0) {
            const reflexionPromises = reflexionQueue.map(async (c) => {
                const eval_ = { score: c.score, reasoning: '', clarity: 5, completeness: 5, actionability: 5 };
                return this.reflexionCorrection(c, eval_);
            });
            const reflexionResults = await Promise.allSettled(reflexionPromises);
            for (const result of reflexionResults) {
                if (result.status === 'fulfilled' && result.value) {
                    const idx = candidates.findIndex(c => c.id === result.value.id.replace('-reflexion', ''));
                    if (idx !== -1) {
                        candidates[idx] = result.value;
                    }
                }
            }
        }
        candidates.sort((a, b) => b.score - a.score);
        return {
            target: createEvolutionId('skill', skill.slug),
            candidates,
            bestCandidate: candidates[0],
            timestamp: Date.now(),
        };
    }
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
            let allTraces = [];
            try {
                if (existsSync(filePath)) {
                    const raw = await readFile(filePath, 'utf-8');
                    allTraces = JSON.parse(raw);
                }
            }
            catch {
                allTraces = [];
            }
            allTraces.push({ skillSlug, trace });
            const skillTraces = allTraces.filter(t => t.skillSlug === skillSlug);
            if (skillTraces.length > MAX_TRACES_PER_SKILL) {
                const toRemove = skillTraces.length - MAX_TRACES_PER_SKILL;
                let removed = 0;
                for (let i = 0; i < allTraces.length && removed < toRemove; i++) {
                    if (allTraces[i].skillSlug === skillSlug) {
                        allTraces.splice(i, 1);
                        removed++;
                        i--;
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
                return;
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
    async performRollback(skillSlug) {
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
        try {
            const writeSuccess = await this.skillManager.writeSkillContent(skill, result.bestCandidate.content);
            if (!writeSuccess) {
                console.error(`[SelfEvolution] Failed to write candidate for ${skillSlug}`);
                return false;
            }
            console.log(`[SelfEvolution] Applied best candidate (score=${result.bestCandidate.score}) to ${skillSlug}`);
            if (this.learningPersistence) {
                await this.learningPersistence.recordSuccess(skillSlug, result.bestCandidate.content, result.bestCandidate.score, false);
            }
        }
        catch (err) {
            console.error(`[SelfEvolution] Write error for ${skillSlug}:`, err);
            return false;
        }
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
export function createSelfEvolutionEngine(skillManager, config, honcho) {
    return new SelfEvolutionEngine(skillManager, config, honcho);
}
