/**
 * Honcho Trace Persistence
 * Stores traces in Honcho session for persistent storage
 */
const TRACE_SESSION = 'zcrystal-traces';
export class HonchoTraceStore {
    honcho;
    constructor(honcho) {
        this.honcho = honcho;
    }
    async recordTrace(skill, action, success, details) {
        const traceData = JSON.stringify({
            type: 'trace',
            skill,
            action,
            success,
            details: details || '',
            timestamp: Date.now()
        });
        try {
            // Use Honcho chat API to store trace as a message
            await this.honcho.addMessages(TRACE_SESSION, [{ content: traceData, peerId: 'system' }]);
            console.log(`[HonchoTrace] Recorded: ${skill}/${action}`);
        }
        catch (err) {
            console.error('[HonchoTrace] Failed to record:', err);
        }
    }
    async getTraces(skill, limit = 100) {
        try {
            const messages = await this.honcho.getMessages(TRACE_SESSION, limit);
            const traces = messages
                .filter(m => {
                try {
                    const data = JSON.parse(m.content || '{}');
                    return data.type === 'trace' && (!skill || data.skill === skill);
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
            console.error('[HonchoTrace] Failed to get traces:', err);
            return [];
        }
    }
}
//# sourceMappingURL=honcho-trace.js.map