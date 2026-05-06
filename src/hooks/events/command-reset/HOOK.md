---
name: command-reset
description: "Intercept and handle /reset command to reset conversation history"
metadata:
  { "openclaw": { "emoji": "🔄", "events": ["command:reset"], "requires": {} } }
---
# Command Reset Hook

Fires when `/reset` command is issued. Use this to:
- Save session memory before reset
- Log reset events
- Notify external systems
- Preserve important context across resets

## Event Context

```typescript
{
  type: "command:reset"
  action: "reset"
  sessionKey: string
  timestamp: number
  context: {
    sessionEntry: any
    previousSessionEntry: any
    commandSource: "cli" | "chat" | "api"
    workspaceDir: string
  }
}
```
