/**
 * Self-Doubt Recall System
 * Enables Agent to automatically search FTS5 when it suspects memory gaps
 * 
 * Agent can call zcrystal_recall when:
 * - "我不記得" (I don't remember)
 * - "不確定" (uncertain)
 * - "需要確認" (need to verify)
 * - "之前" (previously/earlier)
 * - "上次" (last time)
 * 
 * This is triggered by Agent self-awareness, not by hooks.
 */

import { spawn } from 'node:child_process';
import { okResult, errResult } from '../index.js';

/**
 * Uncertainty markers that trigger Agent to call zcrystal_recall
 */
export const UNCERTAINTY_MARKERS = [
  '我不記得', '我不記得之前', '不記得',
  '不確定', '不確定是否', '可能',
  '需要確認', '需要驗證',
  '上次', '之前', '之前的工作',
  '延續', '繼續', '任務進度',
  '可能需要', '應該是', '或許',
];

/**
 * Extract recall keywords from Agent's uncertain response
 */
export function extractRecallKeywords(agentResponse: string): string | null {
  // Find which uncertainty marker triggered
  for (const marker of UNCERTAINTY_MARKERS) {
    if (agentResponse.includes(marker)) {
      // Extract surrounding context (nearby keywords)
      const words = agentResponse.split(/[\s,，。!?]+/)
        .filter(w => w.length > 2)
        .filter(w => !marker.includes(w));
      // Return most relevant keywords
      return words.slice(-6).join(' ') || marker;
    }
  }
  return null;
}

/**
 * Quick FTS5 search for recall
 * Returns relevant context for Agent to verify
 */
export async function quickRecall(query: string, limit = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    const script = `
import sys
sys.path.insert(0, '/home/snow/.openclaw')
from skills.fts5 import search
results = search(${JSON.stringify(query)}, limit=${limit})
if results:
    out = []
    for r in results[:5]:
        ts = r.get('timestamp', '')[:16]
        sender = r.get('sender', 'unknown')
        content = r.get('content', '')[:150].replace('\\\\n', ' ')
        out.append(f"[{ts}] [{sender}] {content}")
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