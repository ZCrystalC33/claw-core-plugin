# Claw_Core Plugin

OpenClaw plugin for Claw_Core System integration.

## Features

- **34 Tool Files** — Full bridge to Python Core efficiency modules
- **Event Hooks** — Context compressor, error classifier
- **Tool Registry** — Centralized tool discovery and management
- **Insights Engine** — Performance and quality metrics
- **Credential Pool** — Secure API key management
- **Circuit Breaker** — Fault tolerance patterns
- **Cache, Bulkhead, Rate Limit** — Reliability patterns

## Installation

```bash
openclaw plugins add /path/to/claw-core-plugin
openclaw gateway restart
```

## Plugin Info

| Field | Value |
|-------|-------|
| Name | claw-core-plugin |
| Version | 1.5.1 |
| Entry | `./dist/register.js` |
| Min Gateway | 2026.4.15 |
| Plugin API | >=2026.4.12 |

## Build

```bash
npm install
npm run build
```

## Commands

- `/decompose <task>` — Task decomposition
- `/route-task <task>` — Route task to appropriate agent
- `/benchmark` — Run tool benchmarks
- `/insights` — View system insights

---

*Claw_Core System — AI Agent Infrastructure*