const handler = async (event) => {
    if (event.type !== 'session:compact:after')
        return;
    const ctx = event.context ?? {};
    const compactedCount = ctx.compactedCount ?? 0;
    const summaryLength = ctx.summaryLength ?? 0;
    const tokensBefore = ctx.tokensBefore ?? 0;
    const tokensAfter = ctx.tokensAfter ?? 0;
    const savedTokens = tokensBefore - tokensAfter;
    const efficiency = tokensBefore > 0 ? Math.round((savedTokens / tokensBefore) * 100) : 0;
    console.log(`[claw-core:session-compact-after] Compaction complete`);
    console.log(`[claw-core:session-compact-after] Compacted ${compactedCount} messages → summary ${summaryLength} chars`);
    console.log(`[claw-core:session-compact-after] Tokens: ~${tokensBefore} → ~${tokensAfter} (saved ~${savedTokens}, ${efficiency}%)`);
};
export default handler;
