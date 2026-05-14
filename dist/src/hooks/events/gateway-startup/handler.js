const handler = async (event) => {
    if (event.type !== 'gateway:startup')
        return;
    const ctx = event.context ?? {};
    const channelCount = ctx.channelCount ?? 0;
    const hookCount = ctx.hookCount ?? 0;
    const version = ctx.version ?? 'unknown';
    console.log(`[claw-core:gateway-startup] Gateway started v${version}`);
    console.log(`[claw-core:gateway-startup] Channels: ${channelCount}, Hooks: ${hookCount}`);
    try {
        const { stat } = await import('node:fs/promises');
        const paths = [
            '/home/snow/.openclaw/workspace',
            '/home/snow/.openclaw/skills',
            '/home/snow/.openclaw/memory',
        ];
        for (const p of paths) {
            try {
                await stat(p);
            }
            catch {
                console.warn(`[claw-core:gateway-startup] Critical path missing: ${p}`);
            }
        }
    }
    catch (err) {
        console.warn('[claw-core:gateway-startup] Path check failed:', err);
    }
};
export default handler;
