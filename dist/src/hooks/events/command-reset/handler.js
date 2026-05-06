const handler = async (event) => {
    if (event.type !== 'command:reset' || event.action !== 'reset')
        return;
    const ctx = event.context ?? {};
    const sessionKey = event.sessionKey ?? 'unknown';
    const previousEntry = ctx.previousSessionEntry;
    console.log(`[claw-core:command-reset] Session reset: ${sessionKey}`);
    if (previousEntry) {
        const messageCount = previousEntry.messageCount ?? 0;
        console.log(`[claw-core:command-reset] Preserving ${messageCount} messages from previous session`);
    }
};
export default handler;
//# sourceMappingURL=handler.js.map