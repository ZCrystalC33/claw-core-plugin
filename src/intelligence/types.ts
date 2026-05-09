/**
 * ZCrystal Plugin Types
 */

// ============================================================
// Honcho Types
// ============================================================

export interface HonchoConfig {
  baseUrl: string;
  workspace: string;
}

export interface Peer {
  id: string;
  name: string;
  metadata?: Record<string, unknown>;
}

export interface Session {
  id: string;
  name?: string;
  peerIds?: string[];
  createdAt?: number;
}

export interface Message {
  id?: string;
  content: string;
  peerId: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

export interface SearchResult {
  content: string;
  score: number;
  sessionId?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

// ============================================================
// User Model Types
// ============================================================

export interface UserModel {
  peerId: string;
  preferences: UserPreferences;
  facts: UserFact[];
  learningStyles: string[];
  communicationStyle: string;
  lastUpdated: number;
}

export interface UserPreferences {
  tone?: string;
  detailLevel?: 'brief' | 'medium' | 'detailed';
  topics?: string[];
  style?: string;
}

export interface UserFact {
  fact: string;
  confidence: number;
  source?: string;
  timestamp: number;
}

// ============================================================
// Skill Types (OpenClaw Compatible)
// ============================================================

export interface Skill {
  name: string;
  slug: string;
  version: string;
  description: string;
  filePath: string;
  metadata?: SkillMetadata;
}

export interface SkillMetadata {
  emoji?: string;
  requires?: {
    bins?: string[];
    python?: string[];
    os?: string[];
  };
  configPaths?: string[];
}

export interface SkillEvaluation {
  skill: Skill;
  score: number;
  traces: ExecutionTrace[];
  improvements: SkillImprovement[];
}

export interface ExecutionTrace {
  timestamp: number;
  input: string;
  output: string;
  success: boolean;
  duration: number;
}

export interface SkillImprovement {
  field: 'description' | 'instructions' | 'examples' | 'metadata';
  original: string;
  improved: string;
  rationale: string;
}

// ============================================================
// Self-Evolution Types
// ============================================================

export interface EvolutionConfig {
  target: 'skill' | 'tool' | 'system-prompt' | 'all';
  iterations: number;
  evalSource: 'synthetic' | 'sessiondb';
  provider?: string;
  model?: string;
}

export interface EvolutionResult {
  target: string;
  candidates: EvolutionCandidate[];
  bestCandidate?: EvolutionCandidate;
  timestamp: number;
}

export interface EvolutionCandidate {
  id: string;
  content: string;
  score: number;
  mutations: Mutation[];
}

export interface Mutation {
  type: 'description' | 'instruction' | 'example' | 'parameter' | 'reflexion';
  original: string;
  mutated: string;
  rationale: string;
  // Why + How to Apply (Claude-Memory-Framework pattern)
  principle?: string;        // WHY: generalizable principle
  applicationRule?: string;  // HOW: actionable rule for future cases
}

/**
 * Actionable feedback entry (Claude-Memory-Framework pattern).
 * Records what happened, why it happened, and how to apply the lesson.
 */
export interface FeedbackEntry {
  /** What happened (concrete event description) */
  what: string;
  /** Why this happened (generalizable principle) */
  why: string;
  /** How to apply the principle (actionable rule) */
  howToApply: string;
  /** When this feedback is relevant (context triggers) */
  trigger: string;
  /** Confidence: how generalizable this principle is [0-1] */
  confidence: number;
  /** Timestamp when this feedback was created */
  timestamp: number;
}

// ============================================================
// Memory Types
// ============================================================

/**
 * Memory Layer Key Schema (FIX: Documented to prevent key collisions)
 *
 * L1 (Hot):    hot:{timestamp}          - Short-lived transient data
 * L2 (Session): session:{key}            - Current session state
 * L3 (User):   user:{key}               - Long-term user data
 *              correction:{timestamp}    - Corrections log
 *              pattern:{name}           - Learned patterns
 * L4 (Shared): shared:{key}             - Cross-session shared data
 * L5 (Archive):archive:{key}            - Archived/promoted memories
 *
 * Reserved prefixes (do not use):
 *   - proactive:, action:, session:current, hot:latest
 */

export interface MemoryEntry {
  id: string;
  content: string;
  peer: 'user' | 'assistant' | 'system';
  sessionId: string;
  timestamp: number;
  channel?: string;
  messageId?: string;
  indexedAt?: number;
  metadata?: Record<string, unknown>;
}

export interface MemorySearchOptions {
  query: string;
  limit?: number;
  peer?: 'user' | 'assistant';
  sessionId?: string;
  minScore?: number;
}

// ============================================================
// Plugin Config
// ============================================================

export interface ZCrystalConfig {
  honchoBaseUrl: string;
  workspace: string;
  selfEvolution: {
    enabled: boolean;
    onCompactOnly: boolean;
  };
  skills: {
    autoDiscover: boolean;
    paths: string[];
  };
}
