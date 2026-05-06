const handler = async (event) => {
    if (event.type !== 'command:stop' || event.action !== 'stop')
        return;
    const ctx = event.context ?? {};
    const sessionKey = event.sessionKey ?? 'unknown';
    const commandSource = ctx.commandSource ?? 'unknown';
    console.log(`[claw-core:command-stop] Stop command issued: ${sessionKey}`);
    console.log(`[claw-core:command-stop] Source: ${commandSource}`);
};
export default handler;
//# sourceMappingURL=handler.js.map