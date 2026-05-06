---
name: gateway-startup
description: "Gateway startup notification and boot sequence"
metadata:
  { "openclaw": { "emoji": "🚀", "events": ["gateway:startup"], "requires": {} } }
---
# Gateway Startup Hook

Fires after all channels have started and hooks are loaded. Use this to:
- Send startup notifications
- Initialize per-startup state
- Verify critical services are running
- Log startup metrics

## Event Context

```typescript
{
  type: "gateway:startup"
  action: "startup"
  sessionKey: string
  timestamp: number
  context: {
    channelCount: number
    hookCount: number
    version: string
  }
}
```
