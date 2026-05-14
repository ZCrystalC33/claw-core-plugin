const MAX_CONTEXT_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 8000;
export function compressContext(messages, options = {}) {
    const { maxMessages = MAX_CONTEXT_MESSAGES, maxMessageLength = MAX_MESSAGE_LENGTH } = options;
    if (!messages || messages.length === 0)
        return [];
    let compressed = messages.map(msg => ({
        ...msg,
        content: msg.content.length > maxMessageLength
            ? msg.content.slice(0, maxMessageLength) + `...[truncated ${msg.content.length - maxMessageLength} chars]`
            : msg.content,
    }));
    const collapsed = [];
    for (let i = 0; i < compressed.length; i++) {
        const msg = compressed[i];
        const prev = collapsed[collapsed.length - 1];
        if (prev &&
            prev.role === 'assistant' &&
            msg.role === 'assistant' &&
            prev.content.startsWith('[Tool ') &&
            msg.content.startsWith('[Tool ') &&
            prev.content === msg.content) {
            continue;
        }
        collapsed.push(msg);
    }
    const BOOTSTRAP_KEEP = 6;
    if (collapsed.length > maxMessages) {
        const bootstrap = collapsed.slice(0, BOOTSTRAP_KEEP);
        const tail = collapsed.slice(collapsed.length - (maxMessages - BOOTSTRAP_KEEP));
        return [...bootstrap, ...tail];
    }
    return collapsed;
}
export function estimateTokens(text) {
    let count = 0;
    for (const char of text) {
        if (char.charCodeAt(0) > 127)
            count += 2;
        else
            count += 1;
    }
    return Math.ceil(count / 4);
}
export function createContextCompressorHook(_api) {
    return {
        name: 'clawcore:context-compressor',
        hookKey: 'message:preprocessed',
        async handler(ctx) {
            const messages = ctx.messages;
            if (!messages || messages.length === 0)
                return;
            const beforeCount = messages.length;
            const beforeTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
            const compressed = compressContext(messages);
            const afterTokens = compressed.reduce((sum, m) => sum + estimateTokens(m.content), 0);
            const savedTokens = beforeTokens - afterTokens;
            const savedMessages = beforeCount - compressed.length;
            if (savedTokens > 100 || savedMessages > 2) {
                console.log(`[ZCrystal:context-compressor] Reduced ${beforeCount}→${compressed.length} messages, ` +
                    `~${beforeTokens}→~${afterTokens} tokens (saved ~${savedTokens} tokens, ${savedMessages} msgs)`);
                ctx.messages = compressed;
            }
        },
    };
}
