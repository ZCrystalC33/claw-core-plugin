const handler = async (event) => {
    if (event.type !== 'session:compact:before')
        return;
    const ctx = event.context ?? {};
    const messageCount = ctx.messageCount ?? 0;
    const tokenCount = ctx.tokenCount ?? 0;
    console.log(`[claw-core:session-compact-before] Compaction starting`);
    console.log(`[claw-core:session-compact-before] Messages: ${messageCount}, Tokens: ~${tokenCount}`);
};
export default handler;
