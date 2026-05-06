---
name: session-compact-after
description: "Log compaction results and updated session metrics"
metadata:
  { "openclaw": { "emoji": "✅", "events": ["session:compact:after"], "requires": {} } }
---
# Session Compact After Hook

Fires **after** compaction completes. Use this to:
- Log compaction success/failure
- Record memory flush metrics
- Notify external systems
- Track compaction efficiency

## Event Context

```typescript
{
  type: "session:compact:after"
  action: "compact:after"
  sessionKey: string
  timestamp: number
  context: {
    compactedCount: number
    summaryLength: number
    tokensBefore: number
    tokensAfter: number
  }
}
```
