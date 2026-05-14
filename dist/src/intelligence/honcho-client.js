export class HonchoClient {
    baseUrl;
    workspace;
    apiKey;
    _workspaceChecked = false;
    _workspaceValid = false;
    _workspaceLastCheck = 0;
    WORKSPACE_CACHE_TTL_MS = 60_000;
    constructor(baseUrl, workspace, apiKey) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.workspace = workspace;
        this.apiKey = apiKey;
    }
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        return headers;
    }
    async ensureWorkspace() {
        const now = Date.now();
        if (this._workspaceChecked && this._workspaceValid && (now - this._workspaceLastCheck) < this.WORKSPACE_CACHE_TTL_MS) {
            return true;
        }
        if (this._workspaceChecked && !this._workspaceValid && (now - this._workspaceLastCheck) < this.WORKSPACE_CACHE_TTL_MS) {
            return false;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
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
        }
        catch (err) {
            clearTimeout(timeoutId);
            this._workspaceChecked = true;
            this._workspaceValid = false;
            this._workspaceLastCheck = Date.now();
            return false;
        }
    }
    async peer(peerName) {
        try {
            await this.ensureWorkspace();
            const getResp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/peers/${peerName}`, { headers: this.getHeaders() });
            if (getResp.ok) {
                const data = await getResp.json();
                return { id: data.id, name: data.name, metadata: data.metadata };
            }
            const createResp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/peers`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ id: peerName, metadata: {} }),
            });
            if (createResp.ok || createResp.status === 201) {
                const data = await createResp.json();
                return { id: data.id, name: data.name, metadata: data.metadata };
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async listPeers() {
        try {
            const resp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/peers/list`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({}),
            });
            if (resp.ok) {
                const data = await resp.json();
                return (data.items || []).map((p) => ({
                    id: p.id,
                    name: p.name,
                    metadata: p.metadata,
                }));
            }
            return [];
        }
        catch {
            return [];
        }
    }
    async session(sessionName, _peerIds = []) {
        try {
            await this.ensureWorkspace();
            const getResp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/sessions/${sessionName}`, { headers: this.getHeaders() });
            if (getResp.ok) {
                const data = await getResp.json();
                return { id: data.id, name: data.name };
            }
            const createResp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/sessions`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ id: sessionName }),
            });
            if (createResp.ok || createResp.status === 201) {
                const data = await createResp.json();
                return { id: data.id, name: data.name };
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async listSessions() {
        try {
            const resp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/sessions/list`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({}),
            });
            if (resp.ok) {
                const data = await resp.json();
                return (data.items || []).map((s) => ({
                    id: s.id,
                    name: s.name,
                }));
            }
            return [];
        }
        catch {
            return [];
        }
    }
    _writeCountToday = 0;
    _writeCountDate = '';
    _lastWriteHashes = [];
    MAX_WRITES_PER_DAY = 1000;
    DEDUP_WINDOW = 10;
    _checkAndRecordWrite(messages) {
        const today = new Date().toISOString().slice(0, 10);
        if (this._writeCountDate !== today) {
            this._writeCountDate = today;
            this._writeCountToday = 0;
            this._lastWriteHashes = [];
        }
        if (this._writeCountToday >= this.MAX_WRITES_PER_DAY) {
            console.warn(`[ZCrystal Honcho] Daily write limit reached (${this.MAX_WRITES_PER_DAY}). Blocked.`);
            return false;
        }
        const hashes = messages.map(m => m.content.slice(0, 200).replace(/\s+/g, ' ').trim());
        const allDuplicate = hashes.every(h => this._lastWriteHashes.includes(h));
        if (allDuplicate && hashes.length > 0) {
            console.debug('[ZCrystal Honcho] All messages duplicate, skipping write.');
            return false;
        }
        this._writeCountToday += messages.length;
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
    async addMessages(sessionName, messages) {
        if (messages.length > 0 && !this._checkAndRecordWrite(messages)) {
            return false;
        }
        try {
            await this.ensureWorkspace();
            const apiMessages = messages.map(m => ({
                content: m.content,
                peer_id: m.peerId,
            }));
            const resp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/sessions/${sessionName}/messages`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ messages: apiMessages }),
            });
            return resp.ok || resp.status === 201;
        }
        catch {
            return false;
        }
    }
    async getMessages(sessionName, limit) {
        try {
            const params = new URLSearchParams();
            if (limit)
                params.set('limit', String(limit));
            const resp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/sessions/${sessionName}/context?${params}`, { headers: this.getHeaders() });
            if (resp.ok) {
                const data = await resp.json();
                if (data.content) {
                    return [{ id: 'context', content: data.content, peerId: 'system', timestamp: Date.now() }];
                }
            }
            return [];
        }
        catch {
            return [];
        }
    }
    async search(peerName, query, limit = 10) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const resp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/search`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ query, limit }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (resp.ok) {
                const data = await resp.json();
                return data;
            }
            return [];
        }
        catch {
            return [];
        }
    }
    async ask(peerName, question, depth = 'quick') {
        try {
            const resp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/peers/${peerName}/chat`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ query: question, depth }),
            });
            if (resp.ok) {
                const data = await resp.json();
                return data.content || '';
            }
            const errorText = await resp.text();
            console.error(`[HonchoClient] ask() failed: ${resp.status} - ${errorText}`);
            return '';
        }
        catch (err) {
            console.error(`[HonchoClient] ask() exception:`, err);
            return '';
        }
    }
    async getUserModel(peerName) {
        try {
            const resp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/peers/${peerName}/representation`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({}),
            });
            if (resp.ok) {
                return await resp.json();
            }
            const errorText = await resp.text();
            console.error(`[HonchoClient] getUserModel() failed: ${resp.status} - ${errorText}`);
            return null;
        }
        catch (err) {
            console.error(`[HonchoClient] getUserModel() exception:`, err);
            return null;
        }
    }
    async getSessionContext(sessionName, options = {}) {
        try {
            const params = new URLSearchParams();
            if (options.summary !== undefined)
                params.set('summary', String(options.summary));
            if (options.tokens)
                params.set('tokens', String(options.tokens));
            const resp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/sessions/${sessionName}/context?${params}`, { headers: this.getHeaders() });
            if (resp.ok) {
                return await resp.json();
            }
            return { content: '' };
        }
        catch {
            return { content: '' };
        }
    }
    async healthCheck() {
        try {
            const resp = await fetch(`${this.baseUrl}/health`);
            return resp.ok;
        }
        catch {
            return false;
        }
    }
    async learnFromUser(userId, message) {
        try {
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
        }
        catch (err) {
            console.error('[HonchoClient] learnFromUser error:', err);
            return false;
        }
    }
    async getQueueStatus() {
        try {
            const resp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/queue/status`, { headers: this.getHeaders() });
            if (resp.ok) {
                const data = await resp.json();
                return { pending: data.pending || 0, completed: data.completed || 0 };
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async getTraces(skillSlug) {
        try {
            const messages = await this.getMessages('zcrystal-traces', 100);
            const traces = messages
                .filter(m => {
                try {
                    const data = JSON.parse(m.content || '{}');
                    return data.type === 'trace' && (!skillSlug || data.skill === skillSlug);
                }
                catch {
                    return false;
                }
            })
                .map(m => {
                try {
                    return JSON.parse(m.content || '{}');
                }
                catch {
                    return null;
                }
            })
                .filter(Boolean);
            return traces;
        }
        catch (err) {
            console.error('[HonchoClient] getTraces error:', err);
            return [];
        }
    }
    async updateMessage(sessionName, messageId, newContent, peerId) {
        try {
            await this.ensureWorkspace();
            const correctionPayload = [{
                    role: 'correction',
                    content: newContent,
                    peer_id: peerId,
                    metadata: { correctedFrom: messageId, timestamp: Date.now() },
                }];
            const resp = await fetch(`${this.baseUrl}/v3/workspaces/${this.workspace}/sessions/${sessionName}/messages`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ messages: correctionPayload }),
            });
            return resp.ok || resp.status === 201;
        }
        catch {
            return false;
        }
    }
    async deleteMessage(sessionName, messageId) {
        try {
            await this.ensureWorkspace();
            console.debug(`[HonchoClient] Soft-delete requested for message ${messageId} in session ${sessionName}`);
            const deleteEntry = JSON.stringify({
                type: 'delete',
                messageId,
                sessionName,
                timestamp: Date.now(),
            });
            await this.addMessages('zcrystal-traces', [
                { content: deleteEntry, peerId: 'system' },
            ]);
            return true;
        }
        catch {
            return false;
        }
    }
}
export function createHonchoClient(config = {}) {
    return new HonchoClient(config.baseUrl || 'http://localhost:8000', config.workspace || 'openclaw', config.apiKey);
}
