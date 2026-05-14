/**
 * Hook Registrations
 * Extracted from register.ts — heartbeat, proactive, memory-bank bootstrap
 */

import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import type { ZCrystalState } from './state.js';
import { getZcState } from './state.js';
import { mqiSearch } from '../memory/python-bridge.js';

// ─── Heartbeat ───────────────────────────────────────────────────────────────

export function registerHeartbeat(api: OpenClawPluginApi, zcState: ZCrystalState): () => void {
  const heartbeatInterval = setInterval(async () => {
    try {
      const status = await zcState.router.healthCheck();
      const evo = await zcState.router.getEvolutionStatus();
      if (status.success) {
        console.log('[Claw_Core+ZCrystal Heartbeat] OK - Evolution:', evo.data?.running ? 'running' : 'idle');
      }
    } catch (e) {
      console.error('[Claw_Core+ZCrystal Heartbeat] Error:', e);
    }
  }, 5 * 60 * 1000);

  const proactiveInterval = setInterval(async () => {
    try {
      const sessionResult = await zcState.router.memoryLoad('L2', 'session:current');
      const suggestions = zcState.reviewEngine.getUpgradeSuggestions();
      if (sessionResult.success && sessionResult.data && suggestions.length > 0) {
        console.log('[Claw_Core+ZCrystal Proactive] Session active,', suggestions.length, 'suggestions available');
      }
    } catch (e) {
      console.error('[Claw_Core+ZCrystal Proactive] Error:', e);
    }
  }, 10 * 60 * 1000);

  // Return cleanup function
  return () => {
    clearInterval(heartbeatInterval);
    clearInterval(proactiveInterval);
  };
}

// ─── Memory Bank Bootstrap ────────────────────────────────────────────────────

export async function memoryBankBootstrap(_event: unknown): Promise<void> {
  // Inject dynamic memory context into agent bootstrap
  try {
    const results = await mqiSearch('recent tasks commands insights', ['fts5'], 3);
    const memoryLines: string[] = [];
    for (const result of results) {
      for (const rec of result.records ?? []) {
        if (rec.content) memoryLines.push(rec.content as string);
      }
    }
    if (memoryLines.length > 0) {
      console.log(`[claw-core:memory-bank-bootstrap] Injected ${memoryLines.length} memory context entries`);
    }
  } catch (e) {
    console.warn('[claw-core:memory-bank-bootstrap] Failed to inject memory context:', e);
  }
}