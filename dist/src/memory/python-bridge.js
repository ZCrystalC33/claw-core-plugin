import { spawn } from 'node:child_process';
const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';
function runPythonWithStdin(script, stdinData, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const py = spawn('python3', ['-c', script]);
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => { py.kill(); reject(new Error('Python timeout')); }, timeoutMs);
        py.stdout.on('data', (d) => (stdout += d.toString()));
        py.stderr.on('data', (d) => (stderr += d.toString()));
        py.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0)
                resolve(stdout.trim());
            else
                reject(new Error(stderr || 'exit ' + code));
        });
        py.on('error', (e) => { clearTimeout(timer); reject(e); });
        py.stdin.write(JSON.stringify(stdinData));
        py.stdin.end();
    });
}
export async function mqiSearch(query, sources = ['fts5', 'wiki', 'honcho'], limit = 20) {
    const script = `
import sys
import json
import time
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.memory import MemoryQueryInterface

mqi = MemoryQueryInterface()
start = time.perf_counter()
results = mqi.search("${query.replace(/"/g, '\\"')}", sources=${JSON.stringify(sources)}, limit=${limit})
duration_ms = (time.perf_counter() - start) * 1000

output = []
for r in results:
    output.append({
        "source": r.source.value if hasattr(r.source, 'value') else str(r.source),
        "total": r.total,
        "records": r.records,
        "duration_ms": r.duration_ms,
        "error": r.error
    })
print(json.dumps(output))
`;
    const raw = await runPythonWithStdin(script, {});
    return JSON.parse(raw);
}
export async function fuseKnowledge(entries, query) {
    const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.memory import KnowledgeFusion, KnowledgeEntry, KnowledgeSource

config = FusionConfig()
fusion = KnowledgeFusion(config)
entries = [KnowledgeEntry(
    content=e["content"],
    source=KnowledgeSource(name=e.get("source", "unknown")),
    confidence=e.get("confidence", 0.8),
    tags=tuple(e.get("tags", []))
) for e in ${JSON.stringify(entries)}]
result = fusion.fuse(entries, query=${JSON.stringify(query ?? null)})
print(json.dumps([{k: getattr(e, k) for k in ["id", "content", "source", "confidence"]} for e in result]))
`;
    const raw = await runPythonWithStdin(script, {});
    return raw;
}
export async function zcrystalGetPatterns(skillSlug) {
    const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.memory import ZCrystalInterface, EvolutionId

zc = ZCrystalInterface()
import asyncio
asyncio.run(zc.load())
patterns = asyncio.get_event_loop().run_until_complete(zc.get_patterns())
filtered = [p for p in patterns if "${skillSlug || ''}" == '' or p.skillSlug == "${skillSlug || ''}"]
print(json.dumps([p.to_dict() for p in filtered]))
`;
    const raw = await runPythonWithStdin(script, {}, 45000);
    return JSON.parse(raw);
}
export async function memoryBankIndex(query, limit = 20) {
    const results = await mqiSearch(query, ['fts5'], limit);
    if (!results[0]?.records?.length)
        return '_No matching entries_';
    const entries = results[0].records.map((r) => {
        const content = String(r.content || '');
        return {
            id: r.id || r.rowid || 0,
            snippet: content.slice(0, 100).replace(/\n/g, ' '),
            sender: r.sender || 'unknown',
            timestamp: (r.timestamp || '').slice(0, 16),
            tokens: Math.ceil(content.length / 4),
        };
    });
    const totalTokens = entries.reduce((s, e) => s + e.tokens, 0);
    let md = `### Memory Bank (~${totalTokens} tokens)\n\n`;
    md += `| ID | Date | Sender | Preview | Cost |\n`;
    md += `|----|------|--------|---------|------|\n`;
    for (const e of entries) {
        md += `| #${e.id} | ${e.timestamp} | ${e.sender} | ${e.snippet.slice(0, 40)}... | ~${e.tokens} |\n`;
    }
    md += `\n💡 Fetch full: \`zcrystal_mqi_read id=<ID>\`\n`;
    return md;
}
export async function memoryBankRead(id) {
    const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
import sqlite3
conn = sqlite3.connect('/home/snow/.openclaw/fts5.db')
row = conn.execute('SELECT content, sender, timestamp FROM conversations WHERE rowid = ?', (${id},)).fetchone()
conn.close()
if row:
    print(json.dumps({"content": row[0], "sender": row[1], "timestamp": row[2]}))
else:
    print("{}")
`;
    const raw = await runPythonWithStdin(script, {});
    const data = JSON.parse(raw);
    if (!data.content)
        return `Entry #${id} not found`;
    return `**From:** ${data.sender} | **Time:** ${data.timestamp}\n\n${data.content}`;
}
export async function compressContextWithMQI(messages, maxMessages = 40, maxMessageLength = 8000) {
    const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.memory import KnowledgeFusion, KnowledgeEntry, KnowledgeSource

messages = json.loads(sys.stdin.read())
BOOTSTRAP_KEEP = 6
MAX_MSGS = ${maxMessages}
MAX_LEN = ${maxMessageLength}

# Step 1: Truncate oversized messages
compressed = []
for m in messages:
    content = m["content"] if len(m["content"]) <= MAX_LEN else m["content"][:MAX_LEN] + f"...[truncated]"
    compressed.append({"role": m["role"], "content": content})

# Step 2: Collapse consecutive duplicate tool-results
collapsed = []
for i, msg in enumerate(compressed):
    prev = collapsed[-1] if collapsed else None
    if not (prev and prev["role"] == "assistant" and msg["role"] == "assistant"
            and prev["content"].startswith("[Tool ") and msg["content"].startswith("[Tool ")
            and prev["content"] == msg["content"]):
        collapsed.append(msg)

# Step 3: Keep first N (bootstrap) + last MAX messages
if len(collapsed) > MAX_MSGS:
    result = collapsed[:BOOTSTRAP_KEEP] + collapsed[-(MAX_MSGS - BOOTSTRAP_KEEP):]
else:
    result = collapsed

before_tokens = sum(len(m["content"]) // 4 for m in messages)
after_tokens = sum(len(m["content"]) // 4 for m in result)
print(json.dumps({"compressed": result, "savedTokens": before_tokens - after_tokens, "savedMessages": len(messages) - len(result)}))
`;
    const raw = await runPythonWithStdin(script, messages, 15000);
    return JSON.parse(raw);
}
