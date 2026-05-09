/**
 * FTS5 Bridge - HTTP-based FTS5 search integration
 *
 * Architecture:
 * - Primary: Direct Python subprocess (bypasses MCP HTTP dependency)
 * - Features: Privacy filter, token cost visibility, progressive disclosure
 *
 * Integration: privacy-filter.ts strips <private> tags before indexing
 */

import { config } from './config.js';
import { stripPrivateTags } from './utils/privacy-filter.js';

// FTS5 HTTP MCP URL - used by the plugin directly in index.ts
const FTS5_MCP_URL = config.fts5.mcpUrl;
const FTS5_PORT = config.fts5.port;

export interface FTS5SearchResult {
  content: string;
  score: number;
  sessionId?: string;
  timestamp?: number;
}

export interface FTS5Module {
  search: (query: string, limit?: number) => Promise<FTS5SearchResult[]>;
  summarize: (query: string, limit?: number) => Promise<string>;
  get_stats: () => Promise<{ total: number; last_updated: string }>;
  isAvailable: () => Promise<boolean>;
}

// FIX: Add timeout to prevent hanging on unavailable server
const FTS5_TIMEOUT_MS = 10_000;

// FIX: Health check to determine if FTS5 server is available
let _serverAvailable: boolean | null = null;
let _lastHealthCheck = 0;
const HEALTH_CHECK_TTL_MS = 60_000; // 1 minute cache

export async function fts5IsAvailable(): Promise<boolean> {
  const now = Date.now();
  if (_serverAvailable !== null && (now - _lastHealthCheck) < HEALTH_CHECK_TTL_MS) {
    return _serverAvailable;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(FTS5_MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', params: {}, id: 0 }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    _serverAvailable = resp.ok;
    _lastHealthCheck = now;
    return _serverAvailable;
  } catch {
    _serverAvailable = false;
    _lastHealthCheck = now;
    return false;
  }
}

// HTTP-based FTS5 client
export async function fts5HttpSearch(query: string, limit = 20): Promise<FTS5SearchResult[]> {
  // FIX: Invalidate health cache on each search attempt (transient failures)
  _serverAvailable = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FTS5_TIMEOUT_MS);
    const response = await fetch(FTS5_MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'fts5_search', arguments: { query, limit } },
        id: 2
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json() as { result?: { content?: Array<{ text: string }> } };
    if (data.result?.content?.[0]?.text) {
      try {
        return JSON.parse(data.result.content[0].text);
      } catch {
        return [{ content: data.result.content[0].text, score: 1.0 }];
      }
    }
    return [];
  } catch (e) {
    console.error('[FTS5-Bridge] HTTP search failed:', e);
    return [];
  }
}

export async function fts5HttpStats(): Promise<{ total: number; last_updated: string }> {
  _serverAvailable = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FTS5_TIMEOUT_MS);
    const response = await fetch(FTS5_MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'fts5_stats', arguments: {} },
        id: 3
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json() as { result?: { content?: Array<{ text: string }> } };
    if (data.result?.content?.[0]?.text) {
      try {
        return JSON.parse(data.result.content[0].text);
      } catch {
        return { total: 0, last_updated: new Date().toISOString() };
      }
    }
    return { total: 0, last_updated: new Date().toISOString() };
  } catch (e) {
    console.error('[FTS5-Bridge] HTTP stats failed:', e);
    return { total: 0, last_updated: new Date().toISOString() };
  }
}

// Re-export for compatibility with existing consumers
export const fts5Bridge: FTS5Module = {
  search: fts5HttpSearch,
  summarize: async (query: string, limit = 5) => {
    const results = await fts5HttpSearch(query, limit);
    if (results.length === 0) return 'No results found';
    return results.map(r => r.content).join('\n---\n');
  },
  get_stats: fts5HttpStats,
  isAvailable: fts5IsAvailable,
};
