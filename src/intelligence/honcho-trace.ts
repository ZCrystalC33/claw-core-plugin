/**
 * Honcho Trace Persistence
 * Stores traces in Honcho session for persistent storage
 */

import { HonchoClient } from './honcho-client.js';

const TRACE_SESSION = 'zcrystal-traces';

export class HonchoTraceStore {
  private honcho: HonchoClient;
  
  constructor(honcho: HonchoClient) {
    this.honcho = honcho;
  }
  
  async recordTrace(skill: string, action: string, success: boolean, details?: string): Promise<void> {
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
    } catch (err) {
      console.error('[HonchoTrace] Failed to record:', err);
    }
  }
  
  async getTraces(skill?: string, limit = 100): Promise<unknown[]> {
    try {
      const messages = await this.honcho.getMessages(TRACE_SESSION, limit);
      
      const traces = messages
        .filter(m => {
          try {
            const data = JSON.parse(m.content || '{}');
            return data.type === 'trace' && (!skill || data.skill === skill);
          } catch {
            return false;
          }
        })
        .map(m => {
          try {
            return JSON.parse(m.content || '{}');
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      
      return traces;
    } catch (err) {
      console.error('[HonchoTrace] Failed to get traces:', err);
      return [];
    }
  }
}
