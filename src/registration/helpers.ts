/**
 * FTS5 MCP HTTP Client helpers
 * Extracted from register.ts for modularity
 */

// FTS5 MCP via OpenClaw Gateway MCP endpoint (handles LSP framing internally)
const FTS5_MCP_URL = 'http://localhost:18789/mcp';

export async function fts5Search(query: string, limit = 20) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
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
      return { success: true, data: data.result.content[0].text };
    }
    return { success: false, error: 'FTS5 search failed' };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function fts5Stats() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
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
      return { success: true, data: data.result.content[0].text };
    }
    return { success: false, error: 'FTS5 stats failed' };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}