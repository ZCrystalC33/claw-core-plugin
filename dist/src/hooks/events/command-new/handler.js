const handler = async (event) => {
    if (event.type !== 'command:new' || event.action !== 'new')
        return;
    const ctx = event.context ?? {};
    const sessionKey = event.sessionKey ?? 'unknown';
    const commandSource = ctx.commandSource ?? 'unknown';
    const previousEntry = ctx.previousSessionEntry;
    console.log(`[claw-core:command-new] New session started: ${sessionKey}`);
    console.log(`[claw-core:command-new] Source: ${commandSource}`);
    if (previousEntry) {
        const messageCount = previousEntry.messageCount ?? 0;
        const duration = previousEntry.duration ?? 'unknown';
        console.log(`[claw-core:command-new] Previous session: ${messageCount} messages, duration: ${duration}`);
    }
};
export default handler;
