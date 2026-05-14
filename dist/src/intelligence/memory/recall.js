import { spawn } from 'node:child_process';
export const UNCERTAINTY_MARKERS = [
    '我不記得', '我不記得之前', '不記得',
    '不確定', '不確定是否', '可能',
    '需要確認', '需要驗證',
    '上次', '之前', '之前的工作',
    '延續', '繼續', '任務進度',
    '可能需要', '應該是', '或許',
];
export function extractRecallKeywords(agentResponse) {
    for (const marker of UNCERTAINTY_MARKERS) {
        if (agentResponse.includes(marker)) {
            const words = agentResponse.split(/[\s,，。!?]+/)
                .filter(w => w.length > 2)
                .filter(w => !marker.includes(w));
            return words.slice(-6).join(' ') || marker;
        }
    }
    return null;
}
export async function quickRecall(query, limit = 5) {
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
            if (code === 0)
                resolve(stdout.trim());
            else
                reject(new Error(stderr || `exit ${code}`));
        });
        py.on('error', reject);
    });
}
