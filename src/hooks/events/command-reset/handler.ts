import type { HookEvent } from '../types.js';

const handler = async (event: HookEvent): Promise<void> => {
  if (event.type !== 'command:reset' || event.action !== 'reset') return;

  const ctx = event.context ?? {};
  const sessionKey = event.sessionKey ?? 'unknown';
  const previousEntry = (ctx as any).previousSessionEntry;

  console.log(`[claw-core:command-reset] Session reset: ${sessionKey}`);

  if (previousEntry) {
    const messageCount = (previousEntry as any).messageCount ?? 0;
    console.log(`[claw-core:command-reset] Preserving ${messageCount} messages from previous session`);
  }
};

export default handler;
