---
name: session-compact-before
description: "Capture session state before compaction summarization"
metadata:
  { "openclaw": { "emoji": "💾", "events": ["session:compact:before"], "requires": {} } }
---
# Session Compact Before Hook

Fires **before** compaction summarizes conversation history. Use this to:
- Log compaction statistics
- Prepare memory flush
- Notify external systems
- Capture state for debugging

## Event Context

```typescript
{
  type: "session:compact:before"
  action: "compact:before"
  sessionKey: string
  timestamp: number
  context: {
    messageCount: number
    tokenCount: number
  }
}
```
