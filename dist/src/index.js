/**
 * Plugin Shim - Re-exports types and utilities needed by tool modules
 *
 * This shim provides the types/functions that ZCrystal tool modules expect
 * from the plugin's main index.ts, without requiring full ZCrystal_evo integration.
 *
 * The actual PluginState and okResult/errResult are defined in register.ts.
 * Tool modules (in src/tools/) import from this shim to get type compatibility.
 */
// Result helpers (inline copies to avoid import dependencies)
export function okResult(text, details) {
    return { content: [{ type: 'text', text }], details: details ?? {} };
}
export function errResult(text) {
    return { content: [{ type: 'text', text }], details: {}, isError: true };
}
//# sourceMappingURL=index.js.map