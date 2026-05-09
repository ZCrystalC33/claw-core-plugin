/**
 * Context Compressor Hook
 * 
 * Registers on `message:preprocessed` (isMessagePreprocessedEvent) to compress
 * long conversation context before it reaches the LLM prompt builder.
 * 
 * Uses a simple text-summarization strategy:
 * - Truncates very old system messages beyond a rolling window
 * - Collapses repeated tool results
 * - Keeps the last N messages and first "bootstrap" messages
 */

import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';

// Configuration
const MAX_CONTEXT_MESSAGES = 40;   // Max messages to keep in context window
const MAX_MESSAGE_LENGTH = 8000;   // Max characters per message

interface ContextWindow {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
  }>;
  totalTokens?: number;
}

type MessagePreprocessedContext = {
  from?: string;
  to?: string;
  body?: string;
  bodyForAgent?: string;
  transcript?: string;
  timestamp?: number;
  channelId: string;
  conversationId?: string;
  messageId?: string;
  senderId?: string;
  senderName?: string;
  senderUsername?: string;
  provider?: string;
  surface?: string;
  mediaPath?: string;
  mediaType?: string;
  isGroup?: boolean;
  groupId?: string;
  messages?: ContextWindow['messages'];
  [key: string]: unknown;
};

/**
 * Compress a context window by:
 * 1. Truncating very long individual messages
 * 2. Collapsing adjacent repeated tool results  
 * 3. Trimming oldest messages beyond MAX_CONTEXT_MESSAGES
 */
export function compressContext(
  messages: ContextWindow['messages'],
  options: { maxMessages?: number; maxMessageLength?: number } = {}
): ContextWindow['messages'] {
  const { maxMessages = MAX_CONTEXT_MESSAGES, maxMessageLength = MAX_MESSAGE_LENGTH } = options;

  if (!messages || messages.length === 0) return [];

  // Step 1: Truncate oversized messages
  let compressed = messages.map(msg => ({
    ...msg,
    content: msg.content.length > maxMessageLength
      ? msg.content.slice(0, maxMessageLength) + `...[truncated ${msg.content.length - maxMessageLength} chars]`
      : msg.content,
  }));

  // Step 2: Collapse consecutive repeated tool-results (same pattern)
  const collapsed: typeof compressed = [];
  for (let i = 0; i < compressed.length; i++) {
    const msg = compressed[i];
    const prev = collapsed[collapsed.length - 1];

    if (
      prev &&
      prev.role === 'assistant' &&
      msg.role === 'assistant' &&
      prev.content.startsWith('[Tool ') &&
      msg.content.startsWith('[Tool ') &&
      prev.content === msg.content
    ) {
      // Skip duplicate - already have the result
      continue;
    }
    collapsed.push(msg);
  }

  // Step 3: Keep first N messages (bootstrap) + last MAX messages
  const BOOTSTRAP_KEEP = 6; // Keep first 6 messages (system prompt, etc.)
  if (collapsed.length > maxMessages) {
    const bootstrap = collapsed.slice(0, BOOTSTRAP_KEEP);
    const tail = collapsed.slice(collapsed.length - (maxMessages - BOOTSTRAP_KEEP));
    return [...bootstrap, ...tail];
  }

  return collapsed;
}

/**
 * Estimate token count (rough: ~4 chars per token for English, ~2 for CJK)
 */
export function estimateTokens(text: string): number {
  let count = 0;
  for (const char of text) {
    if (char.charCodeAt(0) > 127) count += 2; // CJK
    else count += 1;
  }
  return Math.ceil(count / 4);
}

/**
 * Create the Context Compressor Hook
 */
export function createContextCompressorHook(_api: OpenClawPluginApi) {
  return {
    name: 'clawcore:context-compressor',
    hookKey: 'message:preprocessed',
    async handler(ctx: MessagePreprocessedContext) {
      // Extract conversation messages from context if present
      const messages = ctx.messages;
      if (!messages || messages.length === 0) return;

      const beforeCount = messages.length;
      const beforeTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);

      const compressed = compressContext(messages);

      const afterTokens = compressed.reduce((sum, m) => sum + estimateTokens(m.content), 0);
      const savedTokens = beforeTokens - afterTokens;
      const savedMessages = beforeCount - compressed.length;

      if (savedTokens > 100 || savedMessages > 2) {
        console.log(
          `[ZCrystal:context-compressor] Reduced ${beforeCount}→${compressed.length} messages, ` +
          `~${beforeTokens}→~${afterTokens} tokens (saved ~${savedTokens} tokens, ${savedMessages} msgs)`
        );
        // Write compressed context back
        ctx.messages = compressed;
      }
    },
  };
}
