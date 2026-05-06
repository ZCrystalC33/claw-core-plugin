---
name: agent-bootstrap
description: "Intercept and modify bootstrap files before they are injected into agent context"
metadata:
  { "openclaw": { "emoji": "📋", "events": ["agent:bootstrap"], "requires": {} } }
---
# Agent Bootstrap Hook

Fires **before** workspace bootstrap files (AGENTS.md, SOUL.md, MEMORY.md, etc.) are injected into the agent's context. Use this to:
- Add/modify bootstrap files dynamically
- Inject workspace-specific context
- Conditionally modify agent behavior based on time/user
- Add custom bootstrap files from external sources

## Event Context

```typescript
{
  type: "agent:bootstrap"
  action: "bootstrap"
  sessionKey: string
  timestamp: number
  context: {
    bootstrapFiles: string[]   // Mutable - add/remove/modify paths
    agentId: string
  }
}
```

## Common Use Cases

- Inject dynamic content based on time of day
- Add user-specific context from external sources
- Conditionally load workspace skills
- Modify SOUL.md behavior based on user state
