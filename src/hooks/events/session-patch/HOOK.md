---
name: session-patch
description: "Monitor session property modifications"
metadata:
  { "openclaw": { "emoji": "📝", "events": ["session:patch"], "requires": {} } }
---
# Session Patch Hook

Fires when session properties are modified. Use this to:
- Audit session changes
- Log configuration changes
- Track session state evolution
- Monitor tool policy changes

## Event Context

```typescript
{
  type: "session:patch"
  action: "patch"
  sessionKey: string
  timestamp: number
  context: {
    sessionEntry: any
    patch: Record<string, any>  // Only changed fields
    cfg: any
  }
}
```

## Notes

- Only changed fields are included in `patch`
- Only privileged clients can trigger patch events
- Useful for auditing and debugging session state changes
