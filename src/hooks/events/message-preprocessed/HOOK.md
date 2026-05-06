---
name: message-preprocessed
description: "Process message after media and link preprocessing"
metadata:
  { "openclaw": { "emoji": "🔗", "events": ["message:preprocessed"], "requires": {} } }
---
# Message Preprocessed Hook

Fires after media and link preprocessing completes (or is skipped). Use this to:
- Log preprocessing results
- Modify enriched content
- Route processed content
- Track media processing metrics

## Event Context

```typescript
{
  type: "message:preprocessed"
  action: "preprocessed"
  sessionKey: string
  timestamp: number
  context: {
    bodyForAgent: string  // Final enriched body
    from: string
    channelId: string
  }
}
```

## Notes

- `bodyForAgent` is the final enriched body after link previews and media processing
- This is the content the agent actually sees
- Use this to modify or enrich content before it reaches the agent
