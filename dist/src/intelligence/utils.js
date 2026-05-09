/**
 * Utility functions for ZCrystal Intelligence Module
 */
/**
 * Ok Result - signals successful operation
 */
export function okResult(text, details) {
    return { content: [{ type: 'text', text }], details: details ?? {} };
}
/**
 * Err Result - signals failed operation
 */
export function errResult(text) {
    return { content: [{ type: 'text', text }], details: {}, isError: true };
}
//# sourceMappingURL=utils.js.map