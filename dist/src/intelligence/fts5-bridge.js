import { config } from './config.js';
const FTS5_MCP_URL = config.fts5.mcpUrl;
const FTS5_PORT = config.fts5.port;
const FTS5_TIMEOUT_MS = 10_000;
let _serverAvailable = null;
let _lastHealthCheck = 0;
const HEALTH_CHECK_TTL_MS = 60_000;
export async function fts5IsAvailable() {
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
    }
    catch {
        _serverAvailable = false;
        _lastHealthCheck = now;
        return false;
    }
}
export async function fts5HttpSearch(query, limit = 20) {
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
        const data = await response.json();
        if (data.result?.content?.[0]?.text) {
            try {
                return JSON.parse(data.result.content[0].text);
            }
            catch {
                return [{ content: data.result.content[0].text, score: 1.0 }];
            }
        }
        return [];
    }
    catch (e) {
        console.error('[FTS5-Bridge] HTTP search failed:', e);
        return [];
    }
}
export async function fts5HttpStats() {
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
        const data = await response.json();
        if (data.result?.content?.[0]?.text) {
            try {
                return JSON.parse(data.result.content[0].text);
            }
            catch {
                return { total: 0, last_updated: new Date().toISOString() };
            }
        }
        return { total: 0, last_updated: new Date().toISOString() };
    }
    catch (e) {
        console.error('[FTS5-Bridge] HTTP stats failed:', e);
        return { total: 0, last_updated: new Date().toISOString() };
    }
}
export const fts5Bridge = {
    search: fts5HttpSearch,
    summarize: async (query, limit = 5) => {
        const results = await fts5HttpSearch(query, limit);
        if (results.length === 0)
            return 'No results found';
        return results.map(r => r.content).join('\n---\n');
    },
    get_stats: fts5HttpStats,
    isAvailable: fts5IsAvailable,
};
