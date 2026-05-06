import type { HookEvent } from '../types.js';

const handler = async (event: HookEvent): Promise<void> => {
  if (event.type !== 'session:patch') return;

  const ctx = event.context ?? {};
  const patch = (ctx as any).patch ?? {};
  const sessionKey = event.sessionKey ?? 'unknown';

  const changedFields = Object.keys(patch);
  console.log(`[claw-core:session-patch] Session modified: ${sessionKey}`);
  console.log(`[claw-core:session-patch] Changed fields: ${changedFields.join(', ')}`);
};

export default handler;
