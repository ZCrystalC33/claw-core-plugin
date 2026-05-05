---
name: Insights
slug: insights
version: 1.0.0
description: "Surface patterns, learnings, and anomalies from accumulated memory and session logs. Use when solving a recurring problem or seeking optimization opportunities."
---

## When to Use

- Solving a problem that feels familiar but you can't remember the solution
- After completing a complex task (record patterns)
- During code review or strategy review
- Weekly review of correction logs

## Sources

1. **FTS5 conversation history** — Search past sessions for similar problems
2. **Self-improving memory** — ~/self-improving/ corrections, patterns
3. **Correction logs** — Past mistakes and how they were fixed
4. **Skill usage metrics** — Which skills fire most, which fail
5. **Project learnings** — Per-project domain knowledge

## Output Format

```
**Insights:** <topic> (last <days> days)

**Patterns:**
- 🔁 <pattern description> — <count>x (last seen: <date>)
- 🔁 <pattern description> — <count>x

**Recent Corrections:**
- ✅ <correction> (applied: <date>)
- ✅ <correction> (applied: <date>)

**Suggestions:**
- 💡 <actionable recommendation>
- 💡 <actionable recommendation>

**Confidence:** <low/medium/high>
```

## Example

**Input:** `/insights --topic trading --limit 5`

**Output:**

```
**Insights:** trading (last 30 days)

**Patterns:**
- 🔁 "Freqtrade dry-run fails on missing indicators" — 4x
- 🔁 "Binance API rate limit hit during backfill" — 2x

**Recent Corrections:**
- ✅ "Use --dry-run-wallet small instead of default" — 2026-04-10
- ✅ "Add exit_profitonly=0.02 to avoid early exits" — 2026-04-05

**Suggestions:**
- 💡 Add indicator presence check to pre-validation step
- 💡 Implement exponential backoff for Binance API calls

**Confidence:** high
```

## Search Strategy

1. Query FTS5 with task keywords
2. Cross-reference with correction logs
3. Filter for recency (last 30 days)
4. Sort by frequency
5. Surface top N actionable items
