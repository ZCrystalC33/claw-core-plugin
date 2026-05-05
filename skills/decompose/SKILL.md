---
name: Decompose
slug: decompose
version: 1.0.0
description: "Break a complex task into structured, ordered sub-tasks. Use when a task is too large, ambiguous, or multi-faceted to execute directly."
---

## When to Use

- Task spans multiple domains or technologies
- Task is vague and needs scope clarification
- User says "do X" but X involves Y, Z, and W
- First step is unclear or blocks starting

## Output Format

- Numbered step list (1 → N)
- Each step: action description + success criteria
- Dependency hints between dependent steps
- Complexity label: trivial / moderate / complex / epic

## Template

```
**Task:** <user description>

**Steps:**

1. 🎯 <action>
   Criteria: <how to verify success>

2. 🎯 <action>
   Criteria: <how to verify success>
   Dependencies: step 1

3. 🎯 <action>
   Criteria: <how to verify success>
   Dependencies: steps 1-2

**Complexity:** <label>
**Estimated steps:** <N>
```

## Example

**Input:** "Set up a new Freqtrade bot with Binance futures"

**Output:**

```
**Task:** Set up a new Freqtrade bot with Binance futures

**Steps:**

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

**Complexity:** complex
**Estimated steps:** 5
```
