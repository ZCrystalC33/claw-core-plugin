---
name: command-new
description: "Intercept and handle /new command to start fresh sessions"
metadata:
  { "openclaw": { "emoji": "🆕", "events": ["command:new"], "requires": {} } }
---
# Command New Hook

Fires when `/new` command is issued. Use this to:
- Save session context before reset
- Log session transition events
- Notify external systems of new session
- Clean up per-session state

## Event Context

```typescript
{
  type: "command:new"
  action: "new"
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
