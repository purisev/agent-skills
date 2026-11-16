---
name: helm
description: >
  Use this skill when the task involves Helm charts or Helm releases for Kubernetes: inspect charts, manage repos, render templates, lint, package, pull, install, upgrade, rollback, test, or debug values. Also use it for Chart.yaml, values.yaml, templates/, charts/, crds/, OCI chart registries, dependency management, or converting raw manifests into a reusable Helm workflow. NOT for generic kubectl-only work that does not involve Helm.
homepage: https://helm.sh/
metadata: {"openclaw":{"emoji":"⎈","requires":{"bins":["helm"]}}}
---

# Helm

Use this skill for Helm CLI workflows on local charts, chart repositories, OCI registries, and installed releases.

Default posture: **inspect first, render locally second, lint third, dry-run fourth, apply last**.

## What this skill is for

Use this skill when the user wants to:
- inspect or understand a Helm chart
- add/update chart repositories and search charts
- pull a chart locally without installing it
- render templates, debug values, or lint a chart
- install, upgrade, test, rollback, or uninstall a release
- package or publish a chart
- work with `Chart.yaml`, `values.yaml`, `values.schema.json`, `templates/`, `charts/`, or `crds/`
- use Helm with OCI registries

Do **not** use this skill for plain Kubernetes work that does not involve Helm.

## Hard safety boundary

Prefer inspection and dry-run before touching a live cluster. Some commands are destructive or irreversible.

Never run these commands without explicit user confirmation and understanding of consequences:
- `helm uninstall` — removes a release and all its resources from the cluster
- `helm rollback` — reverts to a previous revision; may cause downtime
- `helm upgrade` on production releases — always show `--dry-run` output first
- `helm registry login` / `helm push` — external network actions affecting registries

Default rules:
- For install/upgrade: always show `helm template` or `--dry-run --debug` output before applying.
- For uninstall: always show `helm status` and `helm history` first; confirm the user understands what will be deleted.
- For rollback: always show `helm history` first.
- Never infer that a cluster is non-production; ask or treat as production by default.

## Defaults and guardrails

1. Prefer explicit namespace and release names.
   - Use `--namespace <ns>` for release operations unless the user clearly wants the current default namespace.

2. Prefer values files over long inline flags.
   - Use `-f values.yaml` / `--values values.yaml` for reproducibility.
   - Use `--set` only for short scalar overrides.
   - Use `--set-string` when a numeric-looking value must stay a string.
   - Use `--set-file` for long/generated content.
   - Use `--set-json` for structured JSON overrides.

3. Prefer safe inspection before touching a cluster.
   - Inspect chart metadata and defaults with `helm show chart` and `helm show values`.
   - Pull remote charts locally with `helm pull --untar` when deeper inspection is needed.
   - Render locally with `helm template` before install/upgrade.
   - Lint local charts with `helm lint`.

4. For create-or-update deployments, prefer one idempotent command.
   - Use `helm upgrade --install` unless the user explicitly wants separate install and upgrade flows.

5. Before rollback, inspect release history.
   - Use `helm history <release>` before `helm rollback`.

6. Never invent chart names, repo aliases, release names, or flag syntax.
   - Verify with `helm search repo`, `helm show`, `helm status`, or `helm help <subcommand>`.

## Minimal workflow by task

### 1) Discover and inspect a chart

```bash
helm repo add <repo> <url>
helm repo update
helm search repo <keyword>
helm show chart <repo/chart>
helm show values <repo/chart>
helm pull <repo/chart> --untar
```

Use this path when the user wants to understand a chart, inspect defaults, compare options, or review templates without installing anything.

### 2) Create or maintain a local chart

```bash
helm create <chart-name>
helm lint <chart-dir>
helm template <release> <chart-dir> -f <values.yaml>
helm dependency update <chart-dir>
helm package <chart-dir>
```

When working on dependencies, treat `Chart.yaml` as the source of truth and use `helm dependency update` or `helm dependency build` to sync `charts/`.

### 3) Safe preflight before cluster changes

For a local chart:

```bash
helm lint <chart-dir> -f <values.yaml>
helm template <release> <chart-dir> -f <values.yaml>
helm install <release> <chart-dir> -n <namespace> -f <values.yaml> --dry-run --debug
```

For a remote chart:

```bash
helm show values <repo/chart>
helm install <release> <repo/chart> -n <namespace> -f <values.yaml> --dry-run --debug
```

Use `helm template` when you need a local render. Use `helm install ... --dry-run --debug` when you want Helm's install path without actually applying changes.

### 4) Install or upgrade a release

Preferred default:

```bash
helm upgrade --install <release> <chart> -n <namespace> -f <values.yaml>
```

Separate flows when explicitly needed:

```bash
helm install <release> <chart> -n <namespace> -f <values.yaml>
helm upgrade <release> <chart> -n <namespace> -f <values.yaml>
```

After applying, inspect outcome with:

```bash
helm status <release> -n <namespace>
helm get values <release> -n <namespace> -a
helm get manifest <release> -n <namespace>
```

### 5) Troubleshoot a release

```bash
helm status <release> -n <namespace>
helm history <release> -n <namespace>
helm get values <release> -n <namespace> -a
helm get manifest <release> -n <namespace>
helm test <release> -n <namespace>
```

If a deployment needs to be reverted:

```bash
helm history <release> -n <namespace>
helm rollback <release> <revision> -n <namespace>
```

### 6) Uninstall a release

```bash
helm uninstall <release> -n <namespace>
```

Only use `--keep-history` when the user explicitly wants retained release history.

### 7) Work with OCI registries

Login:

```bash
echo "$TOKEN" | helm registry login <registry> -u <user> --password-stdin
```

Pull and inspect:

```bash
helm pull oci://<registry>/<repo>/<chart> --version <chart-version>
helm show all oci://<registry>/<repo>/<chart> --version <chart-version>
```

Push a packaged chart:

```bash
helm package <chart-dir>
helm push <chart-name>-<chart-version>.tgz oci://<registry>/<repo>
```

## Chart structure reminders

A standard chart usually contains:
- `Chart.yaml` — chart metadata
- `values.yaml` — default values
- `values.schema.json` — optional schema for values
- `templates/` — rendered Kubernetes manifests
- `charts/` — chart dependencies
- `crds/` — Custom Resource Definitions

When explaining or debugging a chart, map the user's problem to one of those locations first.

## Troubleshooting rules

1. If values are not behaving as expected:
   - inspect defaults with `helm show values`
   - render with `helm template`
   - inspect computed values with `helm get values -a`

2. If install/upgrade behavior is unclear:
   - inspect `helm status`
   - inspect `helm history`
   - inspect `helm get manifest`

3. If dependencies are missing or stale:
   - inspect `Chart.yaml`
   - run `helm dependency update <chart-dir>`

4. If the chart comes from a repo and you need local inspection:
   - use `helm pull --untar`

5. If working with OCI charts:
   - verify the `oci://` prefix
   - ensure the chart is packaged before push
   - check auth with `helm registry login`

## Important gotchas

- `helm template` renders locally. It is excellent for previewing manifests, but it does not perform server-side validation.
- `helm install --dry-run --debug` and `helm upgrade --dry-run --debug` are useful preflight tools, but CRD-heavy charts can still behave differently; when CRDs are involved, fall back to `helm template` and reason carefully about cluster-side validation.
- For OCI pushes, the chart must already be packaged as `.tgz`.
- For OCI references, use the `oci://` prefix.
- Use `helm help <subcommand>` whenever exact flag syntax matters.
- Prefer reproducible commands and files over one-off ad hoc flag piles.

## Response style when using this skill

When helping the user:
1. State whether the task is chart inspection, chart development, deployment, troubleshooting, packaging, or OCI publishing.
2. Prefer the smallest safe command sequence that solves the task.
3. Explain assumptions: chart source, release name, namespace, values file, and whether cluster access exists.
4. For risky actions, show the inspection/preflight commands before the apply command.
5. After any install/upgrade/rollback guidance, include at least one validation command.
