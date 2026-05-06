import type { HookEvent } from '../types.js';

const handler = async (event: HookEvent): Promise<void> => {
  if (event.type !== 'message:transcribed') return;

  const ctx = event.context ?? {};
  const transcript = (ctx as any).transcript ?? '';
  const from = (ctx as any).from ?? 'unknown';
  const channelId = (ctx as any).channelId ?? 'unknown';
  const mediaPath = (ctx as any).mediaPath ?? 'N/A';

  console.log(`[claw-core:message-transcribed] Transcription received`);
  console.log(`[claw-core:message-transcribed] From: ${from}, Channel: ${channelId}`);
  console.log(`[claw-core:message-transcribed] Duration/Path: ${mediaPath}`);
  console.log(`[claw-core:message-transcribed] Transcript length: ${transcript.length} chars`);

  if (transcript.length > 0) {
    // Index transcript for search (via FTS5)
    if (globalThis.zcState) {
      try {
        const { spawn } = await import('node:child_process');
        const FTS5_REALTIME_INDEXER = require('path').join(
          globalThis.zcState.config?.paths?.home ?? '/home/snow',
          '.openclaw', 'skills', 'fts5', 'realtime_index.py'
        );
        const msgData = JSON.stringify({
          sender: 'user',
          sender_label: from,
          content: `[VOICE] ${transcript}`,
          channel: channelId,
          session_key: event.sessionKey ?? '',
          message_id: `transcribed-${Date.now()}`,
          timestamp: new Date().toISOString(),
        });
        spawn('python3', [FTS5_REALTIME_INDEXER, msgData], { detached: true, stdio: 'ignore' });
      } catch (err) {
        console.warn('[claw-core:message-transcribed] Index failed:', err);
      }
    }
  }
};

export default handler;
