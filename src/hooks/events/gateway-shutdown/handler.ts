import type { HookEvent } from '../types.js';

const handler = async (event: HookEvent): Promise<void> => {
  if (event.type !== 'gateway:shutdown') return;

  const ctx = event.context ?? {};
  const reason = (ctx as any).reason ?? 'unknown';
  const restartExpectedMs = (ctx as any).restartExpectedMs;

  console.log(`[claw-core:gateway-shutdown] Gateway shutting down`);
  console.log(`[claw-core:gateway-shutdown] Reason: ${reason}`);

  if (restartExpectedMs !== null && restartExpectedMs !== undefined) {
    console.log(`[claw-core:gateway-shutdown] Restart expected in ${restartExpectedMs}ms`);
  } else {
    console.log(`[claw-core:gateway-shutdown] No restart expected`);
  }
};

export default handler;
