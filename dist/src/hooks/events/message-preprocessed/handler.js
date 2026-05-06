const handler = async (event) => {
    if (event.type !== 'message:preprocessed')
        return;
    const ctx = event.context ?? {};
    const bodyForAgent = ctx.bodyForAgent ?? '';
    const from = ctx.from ?? 'unknown';
    const channelId = ctx.channelId ?? 'unknown';
    console.log(`[claw-core:message-preprocessed] Preprocessing complete`);
    console.log(`[claw-core:message-preprocessed] From: ${from}, Channel: ${channelId}`);
    console.log(`[claw-core:message-preprocessed] Body length: ${bodyForAgent.length} chars`);
};
export default handler;
//# sourceMappingURL=handler.js.map