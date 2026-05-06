import type { HookEvent } from '../types.js';

const handler = async (event: HookEvent): Promise<void> => {
  if (event.type !== 'session:compact:after') return;

  const ctx = event.context ?? {};
  const compactedCount = (ctx as any).compactedCount ?? 0;
  const summaryLength = (ctx as any).summaryLength ?? 0;
  const tokensBefore = (ctx as any).tokensBefore ?? 0;
  const tokensAfter = (ctx as any).tokensAfter ?? 0;

  const savedTokens = tokensBefore - tokensAfter;
  const efficiency = tokensBefore > 0 ? Math.round((savedTokens / tokensBefore) * 100) : 0;

  console.log(`[claw-core:session-compact-after] Compaction complete`);
  console.log(`[claw-core:session-compact-after] Compacted ${compactedCount} messages → summary ${summaryLength} chars`);
  console.log(`[claw-core:session-compact-after] Tokens: ~${tokensBefore} → ~${tokensAfter} (saved ~${savedTokens}, ${efficiency}%)`);
};

export default handler;
