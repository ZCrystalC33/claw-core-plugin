export const SKILL_CONTENT = {
    decompose: `---
name: Decompose
slug: decompose
version: 1.0.0
description: "Break a complex task into structured, ordered sub-tasks. Use when a task is too large, ambiguous, or multi-faceted to execute directly."
---

## Usage

/decompose <task description>

## Output

- Numbered step list (1 → N)
- Each step has: action description + success criteria
- Dependency hints between steps
- Estimated complexity label (trivial / moderate / complex / epic)

## Example

**Input:** "Set up a new Freqtrade bot with Binance futures"

**Output:**
1. ✅ Create config.json (exchange API keys, stake currency)
   Criteria: Bot connects to Binance Testnet without errors
2. ✅ Define strategy file (indicators, buy/sell signals)
   Criteria: strategy.py passes freqtrade validate
3. ✅ Backtest with historical data (90-day min)
   Criteria: Sharpe > 0.5, Max Drawdown < 20%
4. ✅ Dry-run live monitoring
   Criteria: Logs show buy/sell signals firing
5. ✅ Paper trade for 48h before real capital
   Criteria: No unhandled exceptions, orders fill correctly
`,
    'route-task': `---
name: Route Task
slug: route-task
version: 1.0.0
description: "Analyze a task and route it to the optimal agent, tool, or skill based on capability matching and current load."
---

## Usage

/route <task description>

## Routing Logic

1. **Intent classification** — What domain? (code, trading, system, research…)
2. **Capability matching** — Which agent/skills handle this?
3. **Load check** — Is the target already busy?
4. **Fallback chain** — Who handles if primary is unavailable?

## Output

- Primary target (agent / skill / tool)
- Fallback chain (ordered list)
- Reasoning (1-2 sentences)
- Estimated fit score (0-100%)

## Example

**Input:** "Debug my Freqtrade strategy not triggering buy signals"

**Output:**
- **Primary:** /skill claw-code:debug + freqtrade bot context
- **Fallback:** @trading-expert agent → manual review
- **Reasoning:** Task requires Python debugging + domain knowledge
- **Fit:** 92%
`,
    benchmark: `---
name: Benchmark
slug: benchmark
version: 1.0.0
description: "Benchmark tool, strategy, or model performance against defined metrics. Use to compare alternatives before committing."
---

## Usage

/benchmark <target> --metrics <list> --baseline <reference>

## Metrics

- Latency (ms per operation)
- Accuracy (output quality score)
- Cost (API credits / compute units)
- Throughput (ops/sec)
- Error rate (% failed operations)

## Output

| Target | Metric | Score | vs Baseline |
|--------|--------|-------|------------|
| GPT-4  | Latency | 120ms | +15ms slower |
| Claude | Latency | 105ms | baseline |

## When to Run

- Before adopting a new model or tool
- After strategy parameter changes
- Weekly performance review
`,
    insights: `---
name: Insights
slug: insights
version: 1.0.0
description: "Surface patterns, learnings, and anomalies from accumulated memory and session logs. Use when solving a recurring problem or seeking optimization opportunities."
---

## Usage

/insights [--topic <domain>] [--since <days>] [--limit 10]

## Sources

- Self-improving memory (~/self-improving/)
- FTS5 conversation history
- Correction logs
- Skill usage metrics

## Output

- Top patterns (with frequency count)
- Recent corrections relevant to topic
- Suggested next actions

## Example

**Input:** /insights --topic trading --limit 5

**Output:**
- 🔁 "Freqtrade dry-run validation fails on missing indicators" — 4x
- ✅ "Use --dry-run-wallet small instead of default" — confirmed
- 💡 Suggestion: Add indicator presence check to pre-validation
`,
};
