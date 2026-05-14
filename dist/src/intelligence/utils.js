export function okResult(text, details) {
    return { content: [{ type: 'text', text }], details: details ?? {} };
}
export function errResult(text) {
    return { content: [{ type: 'text', text }], details: {}, isError: true };
}
