import type { HookEvent } from '../types.js';

const handler = async (event: HookEvent): Promise<void> => {
  if (event.type !== 'session:compact:before') return;

  const ctx = event.context ?? {};
  const messageCount = (ctx as any).messageCount ?? 0;
  const tokenCount = (ctx as any).tokenCount ?? 0;

  console.log(`[claw-core:session-compact-before] Compaction starting`);
  console.log(`[claw-core:session-compact-before] Messages: ${messageCount}, Tokens: ~${tokenCount}`);
};

export default handler;
