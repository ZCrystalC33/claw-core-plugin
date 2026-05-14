const handler = async (event) => {
    if (event.type !== 'session:patch')
        return;
    const ctx = event.context ?? {};
    const patch = ctx.patch ?? {};
    const sessionKey = event.sessionKey ?? 'unknown';
    const changedFields = Object.keys(patch);
    console.log(`[claw-core:session-patch] Session modified: ${sessionKey}`);
    console.log(`[claw-core:session-patch] Changed fields: ${changedFields.join(', ')}`);
};
export default handler;
