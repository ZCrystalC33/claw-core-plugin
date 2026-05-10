# Claw_Core Plugin - Specification

## 1. Overview

- **Name**: Claw_Core Plugin
- **Type**: OpenClaw Plugin (TypeScript)
- **Version**: 1.6.0
- **Purpose**: Bridge OpenClaw to Python Claw_Core efficiency modules
- **Entry**: `./dist/register.js`

## 2. System Architecture

```
OpenClaw Gateway
└── claw-core-plugin (TypeScript)
    ├── tools/ (21 modules)
    │   ├── core-tools.ts
    │   ├── decompose-router.ts
    │   ├── decomposer-tools.ts
    │   ├── task-tools.ts
    │   ├── workflow-tools.ts
    │   └── ... (17 more)
    ├── intelligence/
    │   ├── self-evolution.ts
    │   ├── skill-manager.ts
    │   └── fts5-bridge.ts
    ├── services/
    │   ├── credential-pool.ts
    │   └── mcp-bridge.ts
    ├── hooks/
    │   ├── context-compressor.ts
    │   └── error-classifier.ts
    └── signals/
        └── tools.ts
```

## 3. Security Specification

| ID | Threat | Mitigation |
|----|--------|------------|
| H1 | SQL injection (decompose-router L69) | `runPythonWithStdin` with JSON serialization |
| H2 | SQL injection (decompose-router L105) | Pass subtasks as Python variable via stdin |
| H3 | Command injection (core-tools L72) | Pass query as spawn argv, not embedded string |
| H4 | Plaintext API keys | OS Keychain storage (secret-tool/security) |
| H5 | Race condition (self-evolution) | catch + finally dual cleanup of evolvingSkills Set |

## 4. Tool Inventory

### Core Bridge Tools
- `zcrystal_search` — FTS5 conversation search
- `zcrystal_health` — System health check
- `zcrystal_ask_user` — Ask user via Honcho

### Decomposer Tools
- `clawcore_decompose` — Task decomposition (stdin bridge)
- `zcrystal_decompose` — Alternative decompose
- `decomposer_decompose` — Real Python bridge

### Router Tools
- `zcrystal_route_task` — Route subtasks to agents

### Task Tools
- `zcrystal_task_create`
- `zcrystal_task_get`
- `zcrystal_task_stats`

### Memory Tools
- `zcrystal_memory_store` (L1-L5)
- `zcrystal_memory_get`

### Pattern & Correction Tools
- `zcrystal_pattern_add`
- `zcrystal_correction_add`
- `zcrystal_correction_list`

### Credential Tools
- `zcrystal_credential_add`
- `zcrystal_credential_list`
- `zcrystal_credential_delete`

## 5. Build & Deploy

```bash
npm install
npm run build   # tsc → dist/
openclaw gateway restart
```

### Requirements
- Node.js 18+
- TypeScript 5.6+
- openclaw >= 2026.4.15

## 6. Commands

| Command | Description |
|---------|-------------|
| `/decompose <task>` | Task decomposition |
| `/route-task <task>` | Route to appropriate agent |
| `/benchmark` | Run tool benchmarks |
| `/insights` | View system insights |

## 7. Version History

- **1.6.0** (2026-05-10): Security fixes H1-H5, decomposer bridge, p-var cleanup
- **1.5.1** (2026-05-07): 34 tool files, MCP bridge
- **1.5.0** (2026-05-05): 12 new modules
- **1.4.0** (2026-05-04): Initial release