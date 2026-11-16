---
name: metricsql
description: >
  Use this skill when the task is to write, explain, debug, optimize, or translate monitoring queries in VictoriaMetrics MetricsQL: dashboards, panels, alerts, recording rules, ad hoc analysis in vmui or Grafana, PromQL-to-MetricsQL conversion, label joins, rollups, aggregations, counters, gauges, histograms, percentiles, error ratios, saturation, SLO/SLI queries, WITH templates, label manipulation, gap filling, or query troubleshooting. Also use it for VictoriaMetrics, MetricsQL, vmui, vmalert `expr`, `keep_metric_names`, `default`, `if`, `ifnot`, `group_left(*)`, `label_replace`, `label_set`, `histogram_quantile`, `rate`, `increase`, `topk_*`, `outliers_*`, `1i`, `Ni`, `offset`, or subqueries. NOT for VictoriaMetrics deployment, retention, ingestion, cluster administration, scraping config, vmagent setup, or infrastructure operations.
homepage: https://docs.victoriametrics.com/victoriametrics/metricsql/
metadata: {"openclaw":{"emoji":"📈"}}
---

# MetricsQL

Use this skill to help the user **write correct MetricsQL queries for monitoring**.

Default posture: **translate the monitoring intent into a concrete query, explain why the query is shaped that way, state assumptions about metric names / labels / metric type, and prefer safe, readable MetricsQL idioms over clever one-liners**.

## What this skill is for

Use this skill when the user wants to:
- write or debug MetricsQL queries for Grafana, vmui, or `vmalert`
- convert PromQL to MetricsQL and take advantage of MetricsQL-specific features
- build dashboard panels, alert expressions, SLI/SLO queries, or ad hoc monitoring queries
- compute rates, increases, deltas, averages, percentiles, histograms, top-k, anomaly-style views, or error ratios
- join labels across metrics, normalize or rewrite labels, or collapse / regroup series
- fill gaps, mask series, preserve metric names, or structure large queries with `WITH`
- troubleshoot empty results, noisy results, duplicated series, wrong grouping, or surprising label behavior

Do **not** use this skill for VictoriaMetrics deployment, storage layout, retention policy changes, vmagent configuration, scrape config authoring, or operational administration of the monitoring stack.

## Hard boundary

This skill is about **query authoring and query reasoning only**.

Do not turn it into an infrastructure or product-administration skill. In particular, do not use it to:
- administer VictoriaMetrics clusters or single-node instances
- change scrape or remote write configuration
- manage retention, storage, tenancy, auth, or backup policy
- run migration or ingestion tooling
- perform Kubernetes / Terraform / Helm / Git operations unless another skill covers them

If the user asks for operational changes, limit this skill to the query or alert expression portion only.

## Core workflow

When writing a MetricsQL query, follow this order:

1. Identify the **question type**.
   - Current value?
   - Trend over time?
   - Counter rate or increase?
   - Error ratio?
   - Percentile / histogram?
   - Top-N / outlier view?
   - Alert threshold?

2. Identify the **metric type**.
   - **Counter**: usually use `rate()` or `increase()`.
   - **Gauge**: usually use the raw series, `avg_over_time()`, `max_over_time()`, `min_over_time()`, `delta()`, or other rollups.
   - **Histogram buckets**: usually use `sum(rate(<bucket>[window])) by (le, ...)` and then `histogram_quantile()`.

3. Start with the **smallest correct selector**.
   - Use the exact metric name if known.
   - Add only the label matchers needed for scope.
   - Do not invent labels or assume Kubernetes labels without evidence.

4. Choose the **time window / rollup**.
   - For counters, start with `rate(metric[5m])` for dashboards unless the user needs a different smoothing window.
   - For sparse or slow counters, consider `increase(metric[window])` when absolute increments are more meaningful than per-second rate.
   - For gauges, choose a rollup that matches the question instead of wrapping everything in `rate()`.

5. Choose **aggregation and grouping**.
   - Aggregate *after* the rollup for counters in most cases.
   - Preserve only the labels that matter for the result.
   - Be explicit with `by (...)` / `without (...)`.

6. Add **MetricsQL-specific helpers** only when they solve a real problem.
   - `keep_metric_names` when name loss causes confusion or duplicate-series issues.
   - `default`, `if`, `ifnot` for gap filling and masking.
   - `label_*` helpers when labels need reshaping.
   - `WITH` for repeated fragments or long queries.

7. Validate the result mentally.
   - Does the selector match the intended scope?
   - Is the chosen rollup appropriate for the metric type?
   - Is aggregation happening at the right stage?
   - Are the output labels the labels the user actually wants?
   - For alerts, would this expression flap, hide gaps, or over-aggregate?

## Defaults and guardrails

1. Prefer readable queries over maximal compression.
   - Use intermediate `WITH` aliases for repeated selectors or repeated windows.
   - Keep grouping explicit.

2. Prefer metric-type-correct rollups.
   - Counter -> `rate()` / `increase()`.
   - Gauge -> gauge-appropriate rollups or raw series.
   - Histogram -> `rate(bucket[window])` then aggregate by `le` and the desired grouping.

3. Prefer stable dashboard windows.
   - Start with `5m` for service counters and request rates unless the user needs sharper or smoother output.
   - Use larger windows for sparse data.

4. Do not invent schema.
   - If metric names, labels, or bucket names are unknown, make the assumptions explicit.
   - Offer a template query with placeholders rather than pretending certainty.

5. Do not overuse binary joins.
   - Prefer simple grouping first.
   - Use `on(...) group_left(...)` / `group_right(...)` only when label enrichment is actually needed.

6. Be careful with gap filling.
   - `default` can make graphs look complete even when the underlying data is absent.
   - Use it intentionally, especially in alerts.

7. Be careful with percentiles.
   - `histogram_quantile()` is correct only when the bucket series being combined use identical bucket boundaries.

## Minimal workflows by task

### 1) “Write me a dashboard query”

Use this structure:

```text
selector -> rollup -> aggregate -> optional label cleanup
```

Examples:

Per-service request rate:

```text
sum(rate(http_requests_total{job="api"}[5m])) by (service)
```

Average CPU by pod:

```text
sum(rate(container_cpu_usage_seconds_total{namespace="prod",container!="POD"}[5m])) by (pod)
```

### 2) “Write me an error ratio / success ratio”

Build numerator and denominator from the same base metric and grouping:

```text
sum(rate(http_requests_total{job="api",status_code=~"5.."}[5m])) by (service)
/
sum(rate(http_requests_total{job="api"}[5m])) by (service)
```

Prefer identical windows and identical grouping on both sides.

### 3) “Write me a latency percentile”

For classic histogram buckets:

```text
histogram_quantile(
  0.95,
  sum(rate(http_request_duration_seconds_bucket{job="api"}[5m])) by (le, service)
)
```

Rules:
- use the bucket metric, not `_sum` or `_count`
- aggregate buckets by `le` plus the output grouping labels
- only combine histograms with compatible bucket boundaries

### 4) “Convert this PromQL to MetricsQL”

Default conversion checklist:
- keep the original query shape first
- then simplify only where MetricsQL gives a cleaner equivalent
- consider omitted lookbehind windows for rollups when that improves readability
- consider `WITH` templates for repeated fragments
- consider `keep_metric_names` if name dropping causes trouble
- preserve semantics before using MetricsQL-specific shortcuts

### 5) “Why is this query empty / noisy / wrong?”

Check in this order:
1. wrong metric name
2. wrong label matchers
3. wrong metric type for the chosen rollup
4. aggregation before rollup instead of after it
5. missing or too-small lookbehind window
6. label mismatch in a binary operation or join
7. name dropping / duplicate-series issues
8. histogram bucket misuse
9. misuse of `default` hiding missing data

## MetricsQL features worth using on purpose

### Omitted lookbehind windows

MetricsQL can omit the square-bracket lookbehind for rollup functions. This often makes dashboard queries shorter and works well with step-aware evaluation.

Examples:

```text
rate(node_network_receive_bytes_total)
avg_over_time(node_load1)
```

Use explicit windows when the user cares about exact smoothing behavior or alert stability.

### `1i` and `Ni`

MetricsQL can refer to the current step (`$__interval` in Grafana) as `1i`, and use multiples such as `10i`.

Examples:

```text
rate(http_requests_total[10i])
rate(metric[10i] offset 5i)
```

Use this when the query should scale with dashboard step.

### `WITH` templates

Use `WITH` when large queries repeat selectors, windows, or prefixes.

Examples:

```text
WITH (
  w = 5m,
  base = http_requests_total{job="api"}
)
sum(rate(base[w])) by (service)
```

String concatenation can also be useful:

```text
WITH (p="http_request_duration_seconds_")
{__name__=p+"bucket"}
```

### `default`, `if`, `ifnot`

Use these only when the semantics are intentional:
- `q1 default q2` -> fill gaps in `q1` with values from `q2`
- `q1 if q2` -> keep values from `q1` only where `q2` exists
- `q1 ifnot q2` -> keep values from `q1` only where `q2` does not exist

Example:

```text
drop_empty_series(error_ratio > 0.05) default 0
```

### `keep_metric_names`

When a rollup, transform, or binary expression drops metric names and that causes confusion or duplicate-series problems, add `keep_metric_names`.

Examples:

```text
rate({__name__=~"foo|bar"}[5m]) keep_metric_names
({__name__=~"foo|bar"} / 10) keep_metric_names
```

### Label manipulation

Useful helpers:
- `label_replace()`
- `label_set()`
- `label_move()`
- `label_transform()`
- `label_match()` / `label_mismatch()`

Example:

```text
label_replace(up{job="node-exporter"}, "component", "node-$1", "instance", "([^:]+):.*")
```

### Label-enriching joins

When one side has the labels you want to copy, use `group_left(*)` or `group_right(*)`.
Add `prefix "..."` if copied labels may collide.

Example:

```text
kube_pod_info
* on(namespace)
group_left(*) prefix "ns_"
kube_namespace_labels
```

## Important gotchas

- MetricsQL is backward-compatible with PromQL, but some behaviors intentionally differ.
- `rate()` and `increase()` in MetricsQL take into account the last raw sample before the lookbehind window and do not extrapolate the result the same way Prometheus does.
- For rollups with omitted windows, MetricsQL auto-selects the window; this is convenient, but use an explicit window when you need predictable alert smoothing.
- Many expressions drop metric names. Use `keep_metric_names` when necessary.
- Plain series selectors are implicitly wrapped with `default_rollup(...)` in many contexts.
- Nested rollups may become subqueries implicitly.
- `default` can hide absence of data; this is often undesirable for alerts.
- Binary joins often fail because the matching labels are wrong, not because the math is wrong.
- For histograms, invalid bucket aggregation can make percentiles meaningless.
- Large queries are easier to maintain with `WITH` than by repeating long selectors.

## Query patterns to reach for first

### Counter rate by service

```text
sum(rate(http_requests_total{job="api"}[5m])) by (service)
```

### Absolute increase over a period

```text
sum(increase(http_requests_total{job="api"}[1h])) by (service)
```

### Current gauge by node

```text
max(node_memory_MemAvailable_bytes{job="node"}) by (instance)
```

### Smoothed gauge average

```text
avg_over_time(node_load1{job="node"}[15m])
```

### p95 latency by service

```text
histogram_quantile(
  0.95,
  sum(rate(http_request_duration_seconds_bucket{job="api"}[5m])) by (le, service)
)
```

### Top 5 hottest series right now

```text
topk(5, sum(rate(http_requests_total[5m])) by (service))
```

### Outlier-style view across peers

```text
outliers_iqr(
  avg_over_time(node_load1[30m])
) by (cluster)
```

### Missing or stale series check

```text
lag(up[15m])
```

## Response style when using this skill

When helping the user:
1. Restate the monitoring question in one sentence.
2. Say whether the target metric behaves like a counter, gauge, or histogram.
3. Provide the MetricsQL query first.
4. Then explain the selector, rollup, aggregation, grouping, and any MetricsQL-specific feature used.
5. State assumptions about metric names, labels, and bucket schema.
6. If the schema is uncertain, give a safe template with placeholders.
7. For alert expressions, call out risks around missing data, gap filling, and overly broad aggregation.
8. Prefer one good default query plus one alternative only when the trade-off is real.

## What not to do

- Do not invent metrics or labels.
- Do not use `rate()` on gauges.
- Do not aggregate histogram buckets incorrectly.
- Do not hide absent data with `default` unless the user really wants that behavior.
- Do not overcomplicate simple queries with joins or templates.
- Do not silently change PromQL semantics during conversion; explain the change.

