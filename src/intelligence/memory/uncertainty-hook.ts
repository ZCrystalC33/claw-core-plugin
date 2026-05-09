/**
 * Uncertainty Detection Hook
 * Monitors Agent responses for uncertainty markers and auto-triggers recall
 * 
 * Implements "方案 C: 混合模式" - system prompt + post-response hook
 * 
 * Flow:
 * 1. Agent responds with uncertainty ("我不記得", "不確定")
 * 2. This hook detects the uncertainty marker
 * 3. Auto-search FTS5 for relevant context
 * 4. Inject results back (via memory system or next prompt hint)
 */

import { spawn } from 'node:child_process';
import { UNCERTAINTY_MARKERS } from './recall.js';

// How many characters to search around the uncertainty marker
const CONTEXT_RANGE = 100;

/**
 * Extract the uncertainty context from an Agent response
 */
export function extractUncertaintyContext(response: string): { marker: string; context: string } | null {
  for (const marker of UNCERTAINTY_MARKERS) {
    const idx = response.indexOf(marker);
    if (idx !== -1) {
      const start = Math.max(0, idx - CONTEXT_RANGE);
      const end = Math.min(response.length, idx + marker.length + CONTEXT_RANGE);
      const context = response.slice(start, end);
      return { marker, context };
    }
  }
  return null;
}

/**
 * Perform auto-search for uncertain context
 * Returns search results or empty string
 */
export async function autoSearchContext(context: string, limit = 3): Promise<string> {
  // Extract key words from context (exclude markers themselves)
  const words = context.split(/[\s,，。!?]+/)
    .filter(w => w.length > 2)
    .filter(w => !UNCERTAINTY_MARKERS.some(m => m.includes(w)));
  
  const query = words.slice(-6).join(' ') || context.slice(0, 50);
  
  return new Promise((resolve, reject) => {
    const script = `
import sys
sys.path.insert(0, '/home/snow/.openclaw')
from skills.fts5 import search
results = search(${JSON.stringify(query)}, limit=${limit})
if results:
    out = []
    for r in results[:${limit}]:
        ts = r.get('timestamp', '')[:16]
        sender = r.get('sender', '')
        content = r.get('content', '')[:120].replace('\\\\n', ' ')
        out.append(f"[{ts}] {sender}: {content}")
    print('\\\\n'.join(out))
else:
    print('')
`;
    const py = spawn('python3', ['-c', script]);
    let stdout = '';
    let stderr = '';
    py.stdout.on('data', (d) => stdout += d.toString());
    py.stderr.on('data', (d) => stderr += d.toString());
    py.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr || `exit ${code}`));
    });
    py.on('error', reject);
  });
}

/**
 * Format uncertainty detection result for logging/injection
 */
export function formatUncertaintyNotice(results: string, marker: string): string {
  if (!results) return '';
  return `\n[MEMORY RECALL] Detected uncertainty ("${marker}"). Auto-searched relevant context:\n${results}\n`;
}