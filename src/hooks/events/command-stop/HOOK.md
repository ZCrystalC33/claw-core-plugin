---
name: command-stop
description: "Intercept /stop command for graceful session termination"
metadata:
  { "openclaw": { "emoji": "🛑", "events": ["command:stop"], "requires": {} } }
---
# Command Stop Hook

Fires when `/stop` command is issued. Use this to:
- Log stop events
- Save partial results
- Notify external systems
- Clean up session resources

## Event Context

```typescript
{
  type: "command:stop"
  action: "stop"
  sessionKey: string
  timestamp: number
  context: {
    sessionEntry: any
    commandSource: "cli" | "chat" | "api"
    workspaceDir: string
  }
}
```

## Notes

- This hook observes the user issuing `/stop`; it is cancellation/command lifecycle, not an agent-finalization gate
- For agent finalization, use the plugin hook `before_agent_finalize` instead
