# Claw_Core Plugin

OpenClaw plugin for Claw_Core System integration.

## Features

- **34+ Tool Files** — Full bridge to Python Core efficiency modules
- **Event Hooks** — Context compressor, error classifier
- **Tool Registry** — Centralized tool discovery and management
- **Insights Engine** — Performance and quality metrics
- **Credential Pool** — Secure API key management (OS Keychain)
- **Circuit Breaker** — Fault tolerance patterns
- **Self-Evolution** — Pattern detection and learning from feedback
- **Decomposer** — Real Python bridge for task decomposition

## Security

- ✅ SQL injection protection (stdin parameterization)
- ✅ Command injection protection (spawn argv isolation)
- ✅ Credential storage in OS Keychain (no plaintext)
- ✅ Race condition protection (evolvingSkills Set cleanup)

## Installation

```bash
openclaw plugins add /path/to/claw-core-plugin
openclaw gateway restart
```

## Plugin Info

| Field | Value |
|-------|-------|
| Name | claw-core-plugin |
| Version | 1.6.0 |
| Entry | `./dist/register.js` |
| Min Gateway | 2026.4.15 |
| Plugin API | >=2026.4.12 |

## Build

```bash
npm install
npm run build
```

## Available Tools

| Tool | Description |
|------|-------------|
| `clawcore_decompose` | Task decomposition via Python Core |
| `zcrystal_decompose` | Alternative decompose router |
| `zcrystal_route_task` | Route subtasks to agents |
| `zcrystal_health` | System health check |
| `zcrystal_search` | FTS5 conversation search |
| `zcrystal_correction_add` | Add L3 correction |
| `zcrystal_pattern_add` | Add successful pattern |
| `decomposer_decompose` | Real Python bridge decomposer |

## Architecture

```
┌──────────────────────────────────────────┐
│         OpenClaw Gateway                 │
├──────────────────────────────────────────┤
│  claw-core-plugin (TypeScript)           │
│  ├── tools/ (21 tool modules)            │
│  ├── intelligence/ (self-evolution)      │
│  ├── services/ (credential pool)        │
│  ├── hooks/ (context, error)            │
│  └── signals/                            │
├──────────────────────────────────────────┤
│  Python Core (openclaw-efficiency-core)   │
│  ├── decomposer.py                       │
│  ├── router.py                           │
│  ├── evolution/                           │
│  └── infrastructure/ (retry, cache...)   │
└──────────────────────────────────────────┘
```

---

*Claw_Core System — AI Agent Infrastructure*