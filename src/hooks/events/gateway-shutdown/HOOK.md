---
name: gateway-shutdown
description: "Log gateway shutdown and perform cleanup"
metadata:
  { "openclaw": { "emoji": "🛑", "events": ["gateway:shutdown"], "requires": {} } }
---
# Gateway Shutdown Hook

Fires when gateway shutdown begins. Use this to:
- Save pending state
- Log shutdown reason
- Close external connections gracefully
- Notify external systems

## Event Context

```typescript
{
  type: "gateway:shutdown"
  action: "shutdown"
  sessionKey: string
  timestamp: number
  context: {
    reason: string
    restartExpectedMs: number | null
  }
}
```
