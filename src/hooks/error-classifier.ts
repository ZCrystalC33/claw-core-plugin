/**
 * Error Classifier Hook
 * 
 * Registers on `after_tool_call` to intercept tool execution errors,
 * classify them by category, and provide actionable recovery suggestions.
 * 
 * Error categories:
 * - NETWORK: Connection/timeout errors
 * - AUTH: Authentication/authorization failures  
 * - VALIDATION: Input/parameter validation errors
 * - RATE_LIMIT: API rate limiting errors
 * - TIMEOUT: Execution timeout
 * - SYSTEM: Internal system errors
 * - UNKNOWN: Uncategorized errors
 */

import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';

export type ErrorCategory =
  | 'NETWORK'
  | 'AUTH'
  | 'VALIDATION'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'SYSTEM'
  | 'UNKNOWN';

export interface ErrorClassification {
  category: ErrorCategory;
  suggestion: string;
  canRetry: boolean;
  severity: 'low' | 'medium' | 'high';
}

const NETWORK_PATTERNS = [
  'ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT',
  'fetch failed', 'NetworkError', 'net::ERR', 'connection failed',
  'socket hang up', 'getaddrinfo', 'EAI_AGAIN',
];

const AUTH_PATTERNS = [
  '401', '403', 'Unauthorized', 'Forbidden', 'Invalid token',
  'token expired', 'auth failed', 'credentials', 'permission denied',
  'API key', 'invalid api', 'unauthorized',
];

const VALIDATION_PATTERNS = [
  'ValidationError', 'invalid param', 'required param',
  'must be a', 'expected type', 'type error',
  'invalid JSON', 'parse error', 'schema',
];

const RATE_LIMIT_PATTERNS = [
  '429', 'rate limit', 'too many requests', 'rate_limit_exceeded',
  'throttl', 'max retries', 'quota exceeded',
];

const TIMEOUT_PATTERNS = [
  'timeout', 'TIMEOUT', 'timed out', 'deadline',
  'request timeout', 'operation timeout',
];

/**
 * Classify a tool error into a category and generate a suggestion
 */
export function classifyError(errorMessage: string): ErrorClassification {
  const msg = errorMessage.toLowerCase();

  // NETWORK errors
  if (NETWORK_PATTERNS.some(p => msg.includes(p.toLowerCase()))) {
    return {
      category: 'NETWORK',
      suggestion: 'Check network connectivity. Verify the service endpoint is reachable. Consider retrying with exponential backoff.',
      canRetry: true,
      severity: 'medium',
    };
  }

  // AUTH errors
  if (AUTH_PATTERNS.some(p => msg.includes(p.toLowerCase()))) {
    return {
      category: 'AUTH',
      suggestion: 'Authentication failed. Verify API keys/tokens are valid and not expired. Check permission scopes.',
      canRetry: false,
      severity: 'high',
    };
  }

  // RATE_LIMIT errors
  if (RATE_LIMIT_PATTERNS.some(p => msg.includes(p.toLowerCase()))) {
    return {
      category: 'RATE_LIMIT',
      suggestion: 'Rate limit hit. Wait before retrying (exponential backoff recommended). Consider caching or batching requests.',
      canRetry: true,
      severity: 'low',
    };
  }

  // TIMEOUT errors
  if (TIMEOUT_PATTERNS.some(p => msg.includes(p.toLowerCase()))) {
    return {
      category: 'TIMEOUT',
      suggestion: 'Operation timed out. Retry with a higher timeout or break the operation into smaller chunks.',
      canRetry: true,
      severity: 'medium',
    };
  }

  // VALIDATION errors
  if (VALIDATION_PATTERNS.some(p => msg.includes(p.toLowerCase()))) {
    return {
      category: 'VALIDATION',
      suggestion: 'Input validation failed. Check parameter types, required fields, and schema compliance.',
      canRetry: false,
      severity: 'medium',
    };
  }

  // System errors
  if (msg.includes('internal server error') || msg.includes('panic') || msg.includes('assertion')) {
    return {
      category: 'SYSTEM',
      suggestion: 'Internal system error. This may be transient - retry after a short delay. If persistent, report to maintainers.',
      canRetry: true,
      severity: 'high',
    };
  }

  // Unknown
  return {
    category: 'UNKNOWN',
    suggestion: 'An unexpected error occurred. Check logs for details. Consider retrying or simplifying the operation.',
    canRetry: true,
    severity: 'medium',
  };
}

type AfterToolCallContext = {
  toolName?: string;
  params?: Record<string, unknown>;
  runId?: string;
  toolCallId?: string;
  result?: unknown;
  error?: string;
  durationMs?: number;
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  [key: string]: unknown;
};

/**
 * Create the Error Classifier Hook
 */
export function createErrorClassifierHook(_api: OpenClawPluginApi) {
  return {
    name: 'clawcore:error-classifier',
    hookKey: 'after_tool_call',
    async handler(event: AfterToolCallContext) {
      if (!event.error) return; // No error to classify

      const { toolName, error, durationMs } = event;
      const classification = classifyError(error);

      const logLine =
        `[ZCrystal:error-classifier] Tool="${toolName || 'unknown'}" ` +
        `Category=${classification.category} ` +
        `Severity=${classification.severity} ` +
        `Retry=${classification.canRetry} ` +
        `Duration=${durationMs ?? 0}ms ` +
        `Error="${error?.slice(0, 120)}" ` +
        `Suggestion="${classification.suggestion}"`;

      if (classification.severity === 'high') {
        console.error(logLine);
      } else {
        console.warn(logLine);
      }

      // Store classification in a way the agent can access via tool context
      // (e.g., lastErrorClassification on the tool context)
      event._zcrystal_error_classification = classification;
    },
  };
}
