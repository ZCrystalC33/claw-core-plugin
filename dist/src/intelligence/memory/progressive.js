/**
 * Progressive Memory Disclosure
 * Based on Claude-Mem's 3-layer pattern: index → timeline → deep-dive
 *
 * Reduces context bloat by fetching metadata first, full content on demand.
 */
import { spawn } from 'node:child_process';
/**
 * Estimate token count from text (rough approximation)
 * Assumes ~4 chars per token for Chinese/English mixed
 */
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
/**
 * Format timestamp to readable date
 */
function formatDate(ts) {
    try {
        const d = new Date(ts);
        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    catch {
        return ts.slice(5, 16); // Fallback: MM-DDTHH:MM
    }
}
/**
 * Extract title from content (first line or first 50 chars)
 */
function extractTitle(content, maxLen = 50) {
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length <= maxLen)
        return firstLine;
    return firstLine.slice(0, maxLen - 3) + '...';
}
/**
 * Classify content type from content patterns
 */
function classifyType(content) {
    const lower = content.toLowerCase();
    if (lower.includes('fix:') || lower.includes('bug fix'))
        return 'bugfix';
    if (lower.includes('feat:') || lower.includes('新增'))
        return 'feature';
    if (lower.includes('refactor:'))
        return 'refactor';
    if (lower.includes('docs:') || lower.includes('readme'))
        return 'docs';
    if (lower.includes('test'))
        return 'test';
    if (lower.includes('error') || lower.includes('failed'))
        return 'error';
    return 'general';
}
/**
 * Layer 1: Get memory index (metadata only, ~50 tokens per entry)
 */
export async function getMemoryIndex(query, limit = 20) {
    return new Promise((resolve, reject) => {
        const script = `
import sys
sys.path.insert(0, '/home/snow/.openclaw')
from skills.fts5 import search
results = search(${JSON.stringify(query)}, limit=${limit})
entries = []
for r in results:
    content = r.get('content', '')
    entries.append({
        'id': r.get('rowid', 0),
        'title': ${JSON.stringify('extract_title')}.__name__,
        'sender': r.get('sender', ''),
        'timestamp': r.get('timestamp', ''),
        'tokenEstimate': len(content) // 4,
        'snippet': content[:100].replace('\\\\n', ' ')
    })
print(entries)
`;
        const py = spawn('python3', ['-c', script]);
        let stdout = '';
        let stderr = '';
        py.stdout.on('data', (d) => stdout += d.toString());
        py.stderr.on('data', (d) => stderr += d.toString());
        py.on('close', (code) => {
            if (code === 0) {
                try {
                    const parsed = JSON.parse(stdout);
                    resolve(Array.isArray(parsed) ? parsed : []);
                }
                catch {
                    resolve([]);
                }
            }
            else {
                reject(new Error(stderr || `exit ${code}`));
            }
        });
        py.on('error', reject);
    });
}
/**
 * Format memory index as markdown table (Token Cost Visibility)
 */
export function formatMemoryIndexTable(entries) {
    if (entries.length === 0)
        return '_No matching memory entries_';
    const totalTokens = entries.reduce((s, e) => s + e.tokenEstimate, 0);
    let md = `### Memory Index (~${totalTokens} tokens)\n\n`;
    md += `| ID | Date | Sender | Title | Type | Cost |\n`;
    md += `|----|------|--------|-------|------|------|\n`;
    for (const e of entries) {
        const date = formatDate(e.timestamp);
        const type = classifyType(e.snippet);
        md += `| #${e.id} | ${date} | ${e.sender} | ${extractTitle(e.snippet)} | ${type} | ~${e.tokenEstimate} |\n`;
    }
    md += `\n💡 **Progressive disclosure:** Fetch full content with \`zcrystal_memory_get id=N\`\n`;
    return md;
}
/**
 * Layer 3: Get full observation by ID
 */
export async function getMemoryEntryById(id) {
    return new Promise((resolve, reject) => {
        const script = `
import sys
sys.path.insert(0, '/home/snow/.openclaw')
import sqlite3
conn = sqlite3.connect('/home/snow/.openclaw/fts5.db')
row = conn.execute('SELECT content FROM conversations WHERE rowid = ?', (${id},)).fetchone()
conn.close()
print(row[0] if row else '')
`;
        const py = spawn('python3', ['-c', script]);
        let stdout = '';
        let stderr = '';
        py.stdout.on('data', (d) => stdout += d.toString());
        py.stderr.on('data', (d) => stderr += d.toString());
        py.on('close', (code) => {
            if (code === 0) {
                resolve(stdout.trim() || null);
            }
            else {
                reject(new Error(stderr || `exit ${code}`));
            }
        });
        py.on('error', reject);
    });
}
//# sourceMappingURL=progressive.js.map