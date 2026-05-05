---
name: Route Task
slug: route-task
version: 1.0.0
description: "Analyze a task and route it to the optimal agent, tool, or skill based on capability matching and current load."
---

## When to Use

- A new task arrives and you need to pick the right executor
- Task spans multiple capability domains
- You are considering spawning a sub-agent
- Task routing is ambiguous

## Routing Logic

1. **Intent classification** — What domain? (code, trading, system, research, comms…)
2. **Capability matching** — Which agent/skills handle this?
3. **Load check** — Is the target already busy?
4. **Fallback chain** — Who handles if primary is unavailable?

## Output Format

```
**Task:** <user description>

**Routing:**
- Primary: <agent/skill/tool>
- Fallback: <ordered list>
- Fit score: <0-100%>

**Reasoning:** <1-2 sentences>

**Chain:**
1. <target> — <role>
2. <target> — <role>
```

## Fit Score

- 90-100%: Primary skill matches exactly
- 70-89%: Strong match, minor adaptation needed
- 50-69%: Partial match, multi-agent collaboration recommended
- <50%: Novel task, start with general agent

## Example

**Input:** "Debug my Freqtrade strategy not triggering buy signals"

**Output:**

```
**Task:** Debug my Freqtrade strategy not triggering buy signals

**Routing:**
- Primary: /skill claw-code + freqtrade context
- Fallback: @trading-expert agent → manual review
- Fit score: 92%

**Reasoning:** Task requires Python debugging + domain knowledge (trading)

**Chain:**
1. Claw_Code agent — Primary Python/strategy debugging
2. freqtrade-validator — Strategy validation
3. Human review — Final sanity check
```
