import type { HookEvent } from '../types.js';

const handler = async (event: HookEvent): Promise<void> => {
  if (event.type !== 'command:stop' || event.action !== 'stop') return;

  const ctx = event.context ?? {};
  const sessionKey = event.sessionKey ?? 'unknown';
  const commandSource = (ctx as any).commandSource ?? 'unknown';

  console.log(`[claw-core:command-stop] Stop command issued: ${sessionKey}`);
  console.log(`[claw-core:command-stop] Source: ${commandSource}`);
};

export default handler;
