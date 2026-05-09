/**
 * Utility functions for ZCrystal Intelligence Module
 */

/**
 * Ok Result - signals successful operation
 */
export function okResult(text: string, details?: unknown) {
  return { content: [{ type: 'text' as const, text }], details: details ?? {} };
}

/**
 * Err Result - signals failed operation
 */
export function errResult(text: string) {
  return { content: [{ type: 'text' as const, text }], details: {}, isError: true };
}