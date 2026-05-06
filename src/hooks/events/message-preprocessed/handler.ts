import type { HookEvent } from '../types.js';

const handler = async (event: HookEvent): Promise<void> => {
  if (event.type !== 'message:preprocessed') return;

  const ctx = event.context ?? {};
  const bodyForAgent = (ctx as any).bodyForAgent ?? '';
  const from = (ctx as any).from ?? 'unknown';
  const channelId = (ctx as any).channelId ?? 'unknown';

  console.log(`[claw-core:message-preprocessed] Preprocessing complete`);
  console.log(`[claw-core:message-preprocessed] From: ${from}, Channel: ${channelId}`);
  console.log(`[claw-core:message-preprocessed] Body length: ${bodyForAgent.length} chars`);
};

export default handler;
