/**
 * OpenClaw Hook Event Types
 * Used by hooks in src/hooks/events/
 */

export interface HookEvent {
  type: string;
  action: string;
  sessionKey: string;
  timestamp: number;
  context?: Record<string, unknown>;
  messages?: Array<{ role: string; content: string }>;
}

export interface GatewayStartupContext {
  channelCount: number;
  hookCount: number;
  version: string;
}

export interface CommandContext {
  sessionEntry?: Record<string, unknown>;
  previousSessionEntry?: Record<string, unknown>;
  commandSource?: 'cli' | 'chat' | 'api';
  workspaceDir?: string;
}

export interface MessageContext {
  from?: string;
  to?: string;
  content?: string;
  channelId?: string;
  timestamp?: number;
  bodyForAgent?: string;
  mediaPath?: string;
  transcript?: string;
  senderId?: string;
  senderName?: string;
  guildId?: string;
}

export interface SessionCompactContext {
  messageCount?: number;
  tokenCount?: number;
  compactedCount?: number;
  summaryLength?: number;
  tokensBefore?: number;
  tokensAfter?: number;
}

export interface GatewayShutdownContext {
  reason: string;
  restartExpectedMs: number | null;
}