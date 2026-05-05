---
name: Benchmark
slug: benchmark
version: 1.0.0
description: "Benchmark tool, strategy, or model performance against defined metrics. Use to compare alternatives before committing."
---

## When to Use

- Before adopting a new model, tool, or strategy
- After making parameter changes to a strategy
- During weekly performance review
- Comparing two alternatives (A/B)

## Metrics

| Metric | Unit | Lower is Better |
|--------|------|-----------------|
| Latency | ms/op | ✅ |
| Cost | credits/op | ✅ |
| Error rate | % failures | ✅ |
| Accuracy | quality 0-1 | ✅ |
| Throughput | ops/sec | ✅ |

## Output Format

```
**Benchmark:** <target> vs <baseline>

| Target | Metric | Score | vs Baseline |
|--------|--------|-------|------------|
| <name> | Latency | <val> | <diff> |
| <name> | Cost | <val> | <diff> |

**Verdict:** <winner> — <reason>
```

## Example

**Input:** `/benchmark GPT-4 --baseline Claude --metrics latency,cost`

**Output:**

```
**Benchmark:** GPT-4 vs Claude

| Target | Metric | Score | vs Baseline |
|--------|--------|-------|------------|
| GPT-4 | Latency | 120ms | +15ms slower |
| Claude | Latency | 105ms | baseline |
| GPT-4 | Cost | $0.01 | +100% |
| Claude | Cost | $0.005 | baseline |

**Verdict:** Claude — 22% faster, 50% cheaper
```

## Running a Benchmark

1. Define baseline and candidate
2. Run identical tasks through both
3. Collect metrics (latency, cost, quality)
4. Tabulate and compare
5. Record verdict in memory

## Template Command

```bash
/benchmark <target> --baseline <ref> --metrics <list> --runs <N>
```
