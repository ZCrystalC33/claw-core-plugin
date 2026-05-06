import type { HookEvent } from '../types.js';

const handler = async (event: HookEvent): Promise<void> => {
  if (event.type !== 'command:new' || event.action !== 'new') return;

  const ctx = event.context ?? {};
  const sessionKey = event.sessionKey ?? 'unknown';
  const commandSource = (ctx as any).commandSource ?? 'unknown';
  const previousEntry = (ctx as any).previousSessionEntry;

  console.log(`[claw-core:command-new] New session started: ${sessionKey}`);
  console.log(`[claw-core:command-new] Source: ${commandSource}`);

  // If there was a previous session, log summary statistics
  if (previousEntry) {
    const messageCount = (previousEntry as any).messageCount ?? 0;
    const duration = previousEntry.duration ?? 'unknown';
    console.log(`[claw-core:command-new] Previous session: ${messageCount} messages, duration: ${duration}`);
  }
};

export default handler;
