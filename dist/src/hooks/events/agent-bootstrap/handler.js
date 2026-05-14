const handler = async (event) => {
    if (event.type !== 'agent:bootstrap')
        return;
    const ctx = event.context ?? {};
    const bootstrapFiles = ctx.bootstrapFiles;
    const agentId = ctx.agentId ?? 'unknown';
    console.log(`[claw-core:agent-bootstrap] Agent "${agentId}" bootstrapping with ${bootstrapFiles?.length ?? 0} files`);
    if (bootstrapFiles && bootstrapFiles.length > 0) {
        const fileList = bootstrapFiles.map((f) => {
            const parts = f.replace(/\\/g, '/').split('/');
            return parts[parts.length - 1];
        }).join(', ');
        console.log(`[claw-core:agent-bootstrap] Files: ${fileList}`);
    }
};
export default handler;
