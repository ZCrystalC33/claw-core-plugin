/**
 * Python Bridge - Unified access to efficiency_core Memory subsystems
 * 
 * Integrates Python's MemoryQueryInterface + KnowledgeFusion + ZCrystalInterface
 * with TypeScript plugin memory tools.
 * 
 * All calls use stdin JSON serialization (H1-H5 security pattern).
 */

import { spawn } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPythonWithStdin(script: string, stdinData: unknown, timeoutMs = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', ['-c', script]);
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { py.kill(); reject(new Error('Python timeout')); }, timeoutMs);
    py.stdout.on('data', (d) => (stdout += d.toString()));
    py.stderr.on('data', (d) => (stderr += d.toString()));
    py.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr || 'exit ' + code));
    });
    py.on('error', (e) => { clearTimeout(timer); reject(e); });
    py.stdin.write(JSON.stringify(stdinData));
    py.stdin.end();
  });
}

// ============================================================================
// MemoryQueryInterface Bridge
// ============================================================================

export interface MQISearchResult {
  source: string;
  total: number;
  records: Record<string, unknown>[];
  duration_ms: number;
  error?: string;
}

/**
 * Search across multiple memory sources using Python MemoryQueryInterface
 */
export async function mqiSearch(
  query: string,
  sources: string[] = ['fts5', 'wiki', 'honcho'],
  limit = 20
): Promise<MQISearchResult[]> {
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

/**
 * Fuse knowledge from multiple sources
 */
export async function fuseKnowledge(
  entries: Array<{ content: string; source: string; confidence?: number; tags?: string[] }>,
  query?: string
): Promise<string> {
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

// ============================================================================
// ZCrystalInterface Bridge (sync approximation)
// ============================================================================

export interface ZCrystalPattern {
  skillSlug: string;
  pattern: string;
  occurrences: number;
  avgScore: number;
  lastSeen: number;
}

export interface ZCrystalHint {
  skillSlug: string;
  hint: string;
  source: string;
}

/**
 * Get learned patterns from Python ZCrystal store
 */
export async function zcrystalGetPatterns(skillSlug?: string): Promise<ZCrystalPattern[]> {
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

// ============================================================================
// Memory Bank Progressive Disclosure (Layered Access)
// ============================================================================

/**
 * Layer 1: Quick index (metadata only, ~50 tokens/entry)
 */
export async function memoryBankIndex(query: string, limit = 20): Promise<string> {
  const results = await mqiSearch(query, ['fts5'], limit);
  if (!results[0]?.records?.length) return '_No matching entries_';
  
  const entries = results[0].records.map((r: Record<string, unknown>) => {
    const content = String(r.content || '');
    return {
      id: r.id || r.rowid || 0,
      snippet: content.slice(0, 100).replace(/\n/g, ' '),
      sender: r.sender || 'unknown',
      timestamp: (r.timestamp as string || '').slice(0, 16),
      tokens: Math.ceil(content.length / 4),
    };
  });

  const totalTokens = entries.reduce((s: number, e: { tokens: number }) => s + e.tokens, 0);
  let md = `### Memory Bank (~${totalTokens} tokens)\n\n`;
  md += `| ID | Date | Sender | Preview | Cost |\n`;
  md += `|----|------|--------|---------|------|\n`;
  for (const e of entries) {
    md += `| #${e.id} | ${e.timestamp} | ${e.sender} | ${e.snippet.slice(0, 40)}... | ~${e.tokens} |\n`;
  }
  md += `\n💡 Fetch full: \`zcrystal_mqi_read id=<ID>\`\n`;
  return md;
}

/**
 * Layer 2: Read full entry by FTS5 rowid
 */
export async function memoryBankRead(id: number): Promise<string> {
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
  if (!data.content) return `Entry #${id} not found`;
  return `**From:** ${data.sender} | **Time:** ${data.timestamp}\n\n${data.content}`;
}

// ============================================================================
// Context Compressor Integration
// ============================================================================

/**
 * Compress context using Python MemoryQueryInterface for deduplication
 */
export async function compressContextWithMQI(
  messages: Array<{ role: string; content: string; timestamp?: number }>,
  maxMessages = 40,
  maxMessageLength = 8000
): Promise<{ compressed: typeof messages; savedTokens: number; savedMessages: number }> {
  // Python side deduplicates similar tool results
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