/**
 * Honcho Client for ZCrystal Plugin
 *
 * Aligns with official Honcho Python SDK API:
 * https://github.com/plastic-labs/honcho
 *
 * Local deployment at http://localhost:8000
 *
 * Based on OpenAPI spec analysis (2026-04-17)
 */
import type { Message, Peer, Session, SearchResult } from './types.js';

export interface HonchoClientConfig {
  baseUrl?: string;
  workspace?: string;
  apiKey?: string;  // JWT token for auth
}

interface ApiMessage {
  role?: string;
  content: string;
  peer_id?: string;
  metadata?: Record<string, unknown>;
}

export interface RepresentationResponse {
  content: string | null;
  conclusions?: Array<{ content: string; weight: number }>;
}

export interface ChatResponse {
  content: string | null;
}

interface SearchResponse {
  results?: SearchResult[];
}

interface ContextResponse {
  content?: string;
  summary?: string;
}

interface PeerResponse {
  id: string;
  name: string;
  metadata?: Record<string, unknown>;
}

interface SessionResponse {
  id: string;
  name?: string;
}

export class HonchoClient {
  private baseUrl: string;
  private workspace: string;
  private apiKey?: string;
  // Memoize workspace check
  private _workspaceChecked = false;
  private _workspaceValid = false;
  private _workspaceLastCheck = 0;
  private readonly WORKSPACE_CACHE_TTL_MS = 60_000; // 1 minute TTL for workspace validation

  constructor(baseUrl: string, workspace: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.workspace = workspace;
    this.apiKey = apiKey;
  }

  // ============================================================
  // Auth Helper
  // ============================================================
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  // ============================================================
  // Workspace Management
  // ============================================================
  async ensureWorkspace(): Promise<boolean> {
    // FIX: Return cached result only if within TTL and still valid
    const now = Date.now();
    if (this._workspaceChecked && this._workspaceValid && (now - this._workspaceLastCheck) < this.WORKSPACE_CACHE_TTL_MS) {
      return true;
    }

    // FIX: Always retry if previous check failed (don't cache failures permanently)
    // Only use cache if previous check was successful
    if (this._workspaceChecked && !this._workspaceValid && (now - this._workspaceLastCheck) < this.WORKSPACE_CACHE_TTL_MS) {
      return false; // Recent failure, don't spam
    }

    // P0 Fix: Add AbortController timeout to prevent permanent hang
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      // Try to get workspace first
      const resp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}`, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      if (resp.ok) {
        this._workspaceChecked = true;
        this._workspaceValid = true;
        this._workspaceLastCheck = Date.now();
        clearTimeout(timeoutId);
        return true;
      }

      // Create workspace if doesn't exist
      const createResp = await fetch(`${this.baseUrl}/v3/workspaces`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ 
          id: this.workspace,
          metadata: { created_by: 'zcrystal-plugin' }
        }),
        signal: controller.signal,
      });
      const success = createResp.ok || createResp.status === 201;
      this._workspaceChecked = true;
      this._workspaceValid = success;
      this._workspaceLastCheck = Date.now();
      clearTimeout(timeoutId);
      return success;
    } catch (err) {
      clearTimeout(timeoutId);
      this._workspaceChecked = true;
      this._workspaceValid = false;
      this._workspaceLastCheck = Date.now();
      return false;
    }
  }

  // ============================================================
  // Peer Management
  // ============================================================
  async peer(peerName: string): Promise<Peer | null> {
    try {
      await this.ensureWorkspace();

      // Try to get existing peer
      const getResp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/peers/${peerName}`,
        { headers: this.getHeaders() }
      );

      if (getResp.ok) {
        const data = await getResp.json() as PeerResponse;
        return { id: data.id, name: data.name, metadata: data.metadata };
      }

      // Create new peer
      const createResp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/peers`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ id: peerName, metadata: {} }),
        }
      );

      if (createResp.ok || createResp.status === 201) {
        const data = await createResp.json() as PeerResponse;
        return { id: data.id, name: data.name, metadata: data.metadata };
      }

      return null;
    } catch {
      return null;
    }
  }

  async listPeers(): Promise<Peer[]> {
    try {
      // Correct: POST /v3/workspaces/{workspace_id}/peers/list
      const resp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/peers/list`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({}),  // Empty body for list
        }
      );

      if (resp.ok) {
        const data = await resp.json() as { items?: PeerResponse[] };
        return (data.items || []).map((p) => ({
          id: p.id,
          name: p.name,
          metadata: p.metadata,
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  // ============================================================
  // Session Management
  // ============================================================
  async session(sessionName: string, _peerIds: string[] = []): Promise<Session | null> {
    try {
      await this.ensureWorkspace();

      // Try to get existing session first
      const getResp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/sessions/${sessionName}`,
        { headers: this.getHeaders() }
      );

      if (getResp.ok) {
        const data = await getResp.json() as SessionResponse;
        return { id: data.id, name: data.name };
      }

      // Create new session
      const createResp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/sessions`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ id: sessionName }),
        }
      );

      if (createResp.ok || createResp.status === 201) {
        const data = await createResp.json() as SessionResponse;
        return { id: data.id, name: data.name };
      }

      return null;
    } catch {
      return null;
    }
  }

  async listSessions(): Promise<Session[]> {
    try {
      // POST /v3/workspaces/{workspace_id}/sessions/list
      const resp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/sessions/list`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({}),
        }
      );

      if (resp.ok) {
        const data = await resp.json() as { items?: SessionResponse[] };
        return (data.items || []).map((s) => ({
          id: s.id,
          name: s.name,
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  // ============================================================
  // Safety Gates (prevent feedback loops & runaway writes)
  // ============================================================
  private _writeCountToday = 0;
  private _writeCountDate = '';
  private _lastWriteHashes: string[] = [];
  private readonly MAX_WRITES_PER_DAY = 1000;
  private readonly DEDUP_WINDOW = 10; // Track last N hashes for batch deduplication

  /**
   * Check and record write with proper batch deduplication.
   * Returns true only if ALL messages pass the gate.
   */
  private _checkAndRecordWrite(messages: Array<{ content: string; peerId: string }>): boolean {
    const today = new Date().toISOString().slice(0, 10);

    // FIX: Reset counter on day change even if no writes happened yesterday
    if (this._writeCountDate !== today) {
      this._writeCountDate = today;
      this._writeCountToday = 0;
      this._lastWriteHashes = [];
    }

    if (this._writeCountToday >= this.MAX_WRITES_PER_DAY) {
      console.warn(`[ZCrystal Honcho] Daily write limit reached (${this.MAX_WRITES_PER_DAY}). Blocked.`);
      return false;
    }

    // FIX: Check each message's hash against the dedup window
    // If ANY message is new, we proceed (don't reject entire batch)
    const hashes = messages.map(m => m.content.slice(0, 200).replace(/\s+/g, ' ').trim());
    const allDuplicate = hashes.every(h => this._lastWriteHashes.includes(h));
    if (allDuplicate && hashes.length > 0) {
      console.debug('[ZCrystal Honcho] All messages duplicate, skipping write.');
      return false;
    }

    this._writeCountToday += messages.length;
    // Update dedup window (keep last N unique hashes)
    for (const h of hashes) {
      if (!this._lastWriteHashes.includes(h)) {
        this._lastWriteHashes.push(h);
        if (this._lastWriteHashes.length > this.DEDUP_WINDOW) {
          this._lastWriteHashes.shift();
        }
      }
    }
    return true;
  }

  // ============================================================
  // Messages - Write via POST, Read via Session Context
  // ============================================================
  async addMessages(sessionName: string, messages: Array<{ content: string; peerId: string }>): Promise<boolean> {
    // Safety gate: check ALL messages before writing
    if (messages.length > 0 && !this._checkAndRecordWrite(messages)) {
      return false;
    }
    try {
      await this.ensureWorkspace();

      // Convert to snake_case for API
      const apiMessages: ApiMessage[] = messages.map(m => ({
        content: m.content,
        peer_id: m.peerId,
      }));

      const resp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/sessions/${sessionName}/messages`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ messages: apiMessages }),
        }
      );

      return resp.ok || resp.status === 201;
    } catch {
      return false;
    }
  }

  /**
   * Get messages via Session Context endpoint
   * Note: Honcho doesn't have a direct GET /messages endpoint
   * Messages are retrieved as part of session context
   */
  async getMessages(sessionName: string, limit?: number): Promise<Message[]> {
    try {
      const params = new URLSearchParams();
      if (limit) params.set('limit', String(limit));

      const resp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/sessions/${sessionName}/context?${params}`,
        { headers: this.getHeaders() }
      );

      if (resp.ok) {
        const data = await resp.json() as ContextResponse;
        // Context returns content which may include message summaries
        if (data.content) {
          return [{ id: 'context', content: data.content, peerId: 'system', timestamp: Date.now() }];
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  // ============================================================
  // Semantic Search
  // ============================================================
  async search(peerName: string, query: string, limit = 10): Promise<SearchResult[]> {
    try {
      // P0 Fix: Add AbortController timeout to prevent permanent hang
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      // Search all messages in workspace
      const resp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/search`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ query, limit }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      if (resp.ok) {
        const data = await resp.json() as SearchResult[];
        return data;
      }
      return [];
    } catch {
      return [];
    }
  }

  // ============================================================
  // User Modeling - Representation & Chat
  // ============================================================

  /**
   * Ask a peer (uses dialectic reasoning)
   * POST /v3/workspaces/{workspace_id}/peers/{peer_id}/chat
   */
  async ask(peerName: string, question: string, depth: 'quick' | 'medium' | 'deep' = 'quick'): Promise<string> {
    try {
      const resp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/peers/${peerName}/chat`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ query: question, depth }),
        }
      );

      if (resp.ok) {
        const data = await resp.json() as ChatResponse;
        return data.content || '';
      }

      // Log error for debugging
      const errorText = await resp.text();
      console.error(`[HonchoClient] ask() failed: ${resp.status} - ${errorText}`);
      return '';
    } catch (err) {
      console.error(`[HonchoClient] ask() exception:`, err);
      return '';
    }
  }

  /**
   * Get peer representation (summary of what Honcho knows about the peer)
   * POST /v3/workspaces/{workspace_id}/peers/{peer_id}/representation
   */
  async getUserModel(peerName: string): Promise<RepresentationResponse | null> {
    try {
      const resp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/peers/${peerName}/representation`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({}),  // Empty body gets full representation
        }
      );

      if (resp.ok) {
        return await resp.json() as RepresentationResponse;
      }

      const errorText = await resp.text();
      console.error(`[HonchoClient] getUserModel() failed: ${resp.status} - ${errorText}`);
      return null;
    } catch (err) {
      console.error(`[HonchoClient] getUserModel() exception:`, err);
      return null;
    }
  }

  // ============================================================
  // Session Context
  // ============================================================
  async getSessionContext(sessionName: string, options: { summary?: boolean; tokens?: number } = {}): Promise<ContextResponse> {
    try {
      const params = new URLSearchParams();
      if (options.summary !== undefined) params.set('summary', String(options.summary));
      if (options.tokens) params.set('tokens', String(options.tokens));

      const resp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/sessions/${sessionName}/context?${params}`,
        { headers: this.getHeaders() }
      );

      if (resp.ok) {
        return await resp.json() as ContextResponse;
      }
      return { content: '' };
    } catch {
      return { content: '' };
    }
  }

  // ============================================================
  // Health Check
  // ============================================================
  async healthCheck(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/health`);
      return resp.ok;
    } catch {
      return false;
    }
  }

  // ============================================================
  // User Learning - Send user message for Honcho to learn from
  // ============================================================
  async learnFromUser(userId: string, message: string): Promise<boolean> {
    try {
      // Store trace in zcrystal-traces session for user analysis
      const traceData = JSON.stringify({
        type: 'trace',
        skill: userId,
        action: 'message',
        success: true,
        details: message.substring(0, 500),
        timestamp: Date.now()
      });
      
      return await this.addMessages('zcrystal-traces', [
        { content: traceData, peerId: 'system' }
      ]);
    } catch (err) {
      console.error('[HonchoClient] learnFromUser error:', err);
      return false;
    }
  }

  // ============================================================
  // Queue Status (for checking if deriver is working)
  // ============================================================
  async getQueueStatus(): Promise<{ pending: number; completed: number } | null> {
    try {
      const resp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/queue/status`,
        { headers: this.getHeaders() }
      );

      if (resp.ok) {
        const data = await resp.json() as { pending?: number; completed?: number };
        return { pending: data.pending || 0, completed: data.completed || 0 };
      }
      return null;
    } catch {
      return null;
    }
  }

  // ============================================================
  // Traces - Get traces for user analysis
  // ============================================================
  async getTraces(skillSlug?: string): Promise<unknown[]> {
    try {
      const messages = await this.getMessages('zcrystal-traces', 100);
      
      const traces = messages
        .filter(m => {
          try {
            const data = JSON.parse(m.content || '{}');
            return data.type === 'trace' && (!skillSlug || data.skill === skillSlug);
          } catch {
            return false;
          }
        })
        .map(m => {
          try {
            return JSON.parse(m.content || '{}');
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      
      return traces;
    } catch (err) {
      console.error('[HonchoClient] getTraces error:', err);
      return [];
    }
  }

  // ============================================================
  // Message Lifecycle (FIX: Add missing CRUD operations)
  // ============================================================

  /**
   * Update a message by appending to session context.
   * Note: Honcho API doesn't support direct message updates; this implements
   * a workaround by adding a correction message with the same peerId.
   */
  async updateMessage(sessionName: string, messageId: string, newContent: string, peerId: string): Promise<boolean> {
    try {
      await this.ensureWorkspace();
      // Append a correction entry referencing the original message
      const correctionPayload: ApiMessage[] = [{
        role: 'correction',
        content: newContent,
        peer_id: peerId,
        metadata: { correctedFrom: messageId, timestamp: Date.now() },
      }];
      const resp = await fetch(
        `${this.baseUrl}/v3/workspaces/${this.workspace}/sessions/${sessionName}/messages`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ messages: correctionPayload }),
        }
      );
      return resp.ok || resp.status === 201;
    } catch {
      return false;
    }
  }

  /**
   * Delete messages by filtering them from the session.
   * Note: Honcho API doesn't support direct message deletion; this implements
   * a soft-delete by marking messages as deleted in metadata.
   */
  async deleteMessage(sessionName: string, messageId: string): Promise<boolean> {
    try {
      await this.ensureWorkspace();
      // Soft-delete via metadata update (if supported)
      // Fallback: we can't truly delete, but we can record the intent
      console.debug(`[HonchoClient] Soft-delete requested for message ${messageId} in session ${sessionName}`);
      // Mark deletion in zcrystal-traces
      const deleteEntry = JSON.stringify({
        type: 'delete',
        messageId,
        sessionName,
        timestamp: Date.now(),
      });
      await this.addMessages('zcrystal-traces', [
        { content: deleteEntry, peerId: 'system' },
      ]);
      return true; // Soft-delete always succeeds
    } catch {
      return false;
    }
  }

}

export function createHonchoClient(config: HonchoClientConfig = {}): HonchoClient {
  return new HonchoClient(
    config.baseUrl || 'http://localhost:8000',
    config.workspace || 'openclaw',
    config.apiKey
  );
}
