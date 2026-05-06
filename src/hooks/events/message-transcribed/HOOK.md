---
name: message-transcribed
description: "Process transcribed audio content from voice messages"
metadata:
  { "openclaw": { "emoji": "🎤", "events": ["message:transcribed"], "requires": {} } }
---
# Message Transcribed Hook

Fires after audio transcription completes. Use this to:
- Log transcription metadata
- Process transcribed content for indexing
- Route transcribed content to other services
- Quality check transcriptions

## Event Context

```typescript
{
  type: "message:transcribed"
  action: "transcribed"
  sessionKey: string
  timestamp: number
  context: {
    transcript: string
    from: string
    channelId: string
    mediaPath: string
  }
}
```
