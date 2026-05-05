/**
 * Plugin Shim - Re-exports types and utilities needed by tool modules
 * 
 * This shim provides the types/functions that ZCrystal tool modules expect
 * from the plugin's main index.ts, without requiring full ZCrystal_evo integration.
 * 
 * The actual PluginState and okResult/errResult are defined in register.ts.
 * Tool modules (in src/tools/) import from this shim to get type compatibility.
 */

// Re-export PluginState type (used by tool modules)
export type { ZCrystalState as PluginState } from '../register.js';

// Result helpers (inline copies to avoid import dependencies)
export function okResult(text: string, details?: unknown) {
  return { content: [{ type: 'text' as const, text }], details: details ?? {} };
}

export function errResult(text: string) {
  return { content: [{ type: 'text' as const, text }], details: {}, isError: true };
}