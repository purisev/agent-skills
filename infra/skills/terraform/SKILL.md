---
name: terraform
description: >
  Use this skill when the task involves Terraform via the ordinary terraform CLI in a **safe preflight mode**: author or inspect Terraform configuration, modules, providers, variables, outputs, backends, workspaces, lock files, formatting, validation, speculative planning, testing, console use, or read-only inspection of state and plan files. Also use it for `.tf`, `.tfvars`, `.terraform.lock.hcl`, `backend` blocks, `terraform init`, `fmt`, `validate`, `plan`, `show`, `output`, `state list/show`, `workspace list/show`, `modules`, or `test`. NOT for `terraform apply`, `destroy`, `import`, or state mutation.
homepage: https://developer.hashicorp.com/terraform/cli
metadata: {"openclaw":{"emoji":"🏗️","requires":{"bins":["terraform"]}}}
---

# Terraform

Use this skill for **safe Terraform CLI workflows only**: local authoring, inspection, validation, testing, speculative planning, and **read-only** inspection of state, outputs, workspaces, and plan artifacts.

Default posture: **format, initialize carefully, validate, create a speculative plan, inspect the result, and stop before any infrastructure-changing action**.

## What this skill is for

Use this skill when the user wants to:
- inspect or understand Terraform configuration
- write or refactor `.tf` files, modules, variables, locals, outputs, or backend blocks
- format and validate configuration
- initialize a working directory safely
- create a speculative plan to review proposed changes
- inspect a plan file, state, outputs, or the current workspace
- troubleshoot initialization, validation, provider, or module issues
- run Terraform tests or use the console to evaluate expressions
- audit module usage in a working directory

Do **not** use this skill for cloud-console operations, provider-specific imperative CLIs, or infrastructure mutation.

## Hard safety boundary

This skill must **not** be used to change managed infrastructure or mutate Terraform state.

Never produce or recommend these commands as part of this skill:
- `terraform apply`
- `terraform destroy`
- `terraform import`
- `terraform state rm`
- `terraform state mv`

Also do not suggest wrappers around them such as:
- saved-plan workflows whose next step is apply
- bulk import flows that end in resource adoption
- “after this, run apply/destroy/import” as the next step
- ad hoc state surgery to force Terraform to forget, rename, or remap resources

If the user asks for infrastructure mutation, stop at a safe preflight artifact instead:
- formatted and validated configuration
- a speculative `terraform plan` result
- a human-readable `terraform show` review
- read-only output or state inspection
- a module or variable refactor that is ready for human review

## Defaults and guardrails

1. Prefer safe initialization.
   - Start with `terraform init -backend=false` when the task is local validation or code review and backend access is not required.
   - Use normal `terraform init` only when backend-aware planning or state inspection is actually needed.
   - Do not use `init -upgrade` unless the user explicitly wants provider upgrades.

2. Prefer files over inline sprawl.
   - Prefer checked-in `.tfvars` files or explicit `-var-file` usage over long ad hoc `-var` piles.
   - Keep provider versions and module versions explicit.
   - Treat `.terraform.lock.hcl` as part of the reproducible workspace.

3. Prefer validation before planning.
   - Run `terraform fmt` first.
   - Then initialize as needed.
   - Then run `terraform validate`.
   - Use `terraform test` when test files exist.
   - Only then produce a speculative plan.

4. Prefer speculative planning only.
   - Use `terraform plan` for review.
   - Do not cross the apply boundary.
   - Do not produce destroy plans.

5. Prefer read-only inspection commands.
   - Use `terraform show`, `terraform output`, `terraform state list`, `terraform state show`, `terraform workspace show`, and `terraform workspace list`.
   - Avoid workspace creation, workspace deletion, and state-editing commands in this skill.

6. Never invent provider behavior, resource arguments, module versions, backend details, or workspace names.
   - Verify from the actual configuration, lock file, current workspace, or command help.

7. Avoid targeted workflows unless Terraform itself suggests them.
   - `-target` is for exceptional situations, not routine operation.

## Minimal workflow by task

### 1) Review or lint a Terraform directory locally

```bash
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

Use this path when the user wants a safe preflight review of configuration quality without touching a configured backend.

### 2) Author or refactor Terraform configuration

```bash
terraform fmt -recursive
terraform init -backend=false
terraform validate
terraform test
```

Use `terraform test` only when the repository contains Terraform test files.

### 3) Produce a speculative plan for review

```bash
terraform init
terraform validate
terraform plan -input=false
```

Use this path when the user wants to preview proposed changes in the context of the current backend, workspace, variables, and provider configuration.

### 4) Inspect plan artifacts, state, outputs, and workspaces

Human-readable plan or state inspection:

```bash
terraform show <plan-file>
terraform show
```

Outputs:

```bash
terraform output
terraform output <name>
```

State inspection:

```bash
terraform state list
terraform state show <resource-address>
```

Workspace inspection:

```bash
terraform workspace show
terraform workspace list
```

Use this path when the user wants to understand reality as Terraform currently sees it, without changing infrastructure or state bindings.

### 5) Inspect modules and evaluate expressions

Module inventory:

```bash
terraform modules
```

Expression console:

```bash
terraform console
```

Use `terraform modules` when auditing declared module usage in the current working directory. Use `terraform console` to explore functions, interpolation, locals, and output expressions.

## Configuration structure reminders

A typical Terraform working directory may contain:
- `.tf` files — configuration
- `.tfvars` files — variable values
- `.terraform.lock.hcl` — provider dependency lock file
- `.terraform/` — downloaded modules and providers
- `tests/` — Terraform test files, when used

When debugging or refactoring, first map the user's question to one of these layers:
- configuration authoring
- input variables and values
- providers and version constraints
- modules and module sources
- backend and workspace context
- state / outputs / plan inspection

## Troubleshooting rules

1. If formatting or syntax looks wrong:
   - run `terraform fmt`
   - run `terraform validate`

2. If validation fails because dependencies are missing:
   - run `terraform init -backend=false`
   - rerun `terraform validate`

3. If the user needs a real preview in backend/workspace context:
   - run `terraform init`
   - run `terraform validate`
   - run `terraform plan -input=false`

4. If behavior differs from expectations and a state-backed workspace already exists:
   - inspect `terraform workspace show`
   - inspect `terraform output`
   - inspect `terraform state list`
   - inspect `terraform state show <resource-address>`

5. If module usage is unclear:
   - inspect the module blocks in configuration
   - run `terraform modules`

6. If a plan or state file must be reviewed carefully:
   - use `terraform show`
   - be careful with JSON output because sensitive values may be exposed in plain text

## Important gotchas

- `terraform validate` checks configuration syntax and internal consistency, but it does **not** validate remote services, provider APIs, or live backend state.
- `terraform plan` is the review boundary in this skill. Do not continue to apply.
- Do not use `terraform plan -destroy` in this skill.
- `terraform show -json` can expose sensitive values from state in plain text.
- `terraform output -json` and `terraform output -raw` can expose sensitive outputs in plain text.
- `terraform init` is safe to rerun, but it can access the configured backend and may require guidance in some backend-change situations.
- `terraform init -backend=false` skips backend configuration and is useful for validation-only workflows.
- Commit `.terraform.lock.hcl` to version control for reproducible provider selections.
- `-target` is not for routine use; reserve it for exceptional situations only.
- `terraform modules` requires Terraform v1.10.0 or later.
- Do not check the `.terraform/` directory into version control.

## Response style when using this skill

When helping the user:
1. State whether the task is configuration authoring, local validation, speculative planning, module inspection, or read-only state/output/workspace inspection.
2. Prefer the smallest safe command sequence that solves the task.
3. Explain assumptions: working directory, backend presence, current workspace, variable files, and whether state access is available.
4. Stop at a review artifact: formatted code, validation output, speculative plan, `terraform show`, or read-only inspection output.
5. Do not provide a final infrastructure-changing command.

