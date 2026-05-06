import type { HookEvent } from '../types.js';

const handler = async (event: HookEvent): Promise<void> => {
  if (event.type !== 'agent:bootstrap') return;

  const ctx = event.context ?? {};
  const bootstrapFiles = (ctx as any).bootstrapFiles as string[] | undefined;
  const agentId = (ctx as any).agentId ?? 'unknown';

  console.log(`[claw-core:agent-bootstrap] Agent "${agentId}" bootstrapping with ${bootstrapFiles?.length ?? 0} files`);

  // Log which bootstrap files are being loaded (for debugging)
  if (bootstrapFiles && bootstrapFiles.length > 0) {
    const fileList = bootstrapFiles.map((f: string) => {
      const parts = f.replace(/\\/g, '/').split('/');
      return parts[parts.length - 1];
    }).join(', ');
    console.log(`[claw-core:agent-bootstrap] Files: ${fileList}`);
  }
};

export default handler;
