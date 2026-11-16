---
name: terramate
description: >
  Use this skill when the task involves Terramate templating, code generation, or Terramate syntax itself: writing or refactoring `.tm.hcl` / `.tm` files, `generate_hcl`, `generate_file`, `globals`, `lets`, `assert`, `stack_filter`, `condition`, `tm_dynamic`, `tm_*` functions, `tm_hcl_expression`, `context = root`, `inherit`, imports, configuration merging, `.tmgen` blueprints, or debugging generated output and syntax errors. Also use it when the task is to translate Terraform/OpenTofu/Terragrunt-like intent into valid Terramate syntax **without inventing unsupported blocks, namespaces, or functions**. NOT for Terramate orchestration, `terramate run`, `terramate script run`, Terramate Cloud, stack lifecycle management, or applying infrastructure.
homepage: https://terramate.io/docs/
metadata: {"openclaw":{"emoji":"🗂️","requires":{"bins":["terramate"]}}}
---

# Terramate

Use this skill for **Terramate templating, code generation, and Terramate syntax only**.

Default posture: **treat Terramate source syntax as a separate language from the Terraform/OpenTofu/Terragrunt code it may generate; write only documented Terramate constructs in `.tm.hcl` / `.tm`; format, generate in the smallest safe scope, inspect origins, and stop before orchestration or infrastructure-changing workflows.**

## Reference material

Before writing any Terramate snippet, consult:
- **[references/terramate-syntax-cheatsheet.md](references/terramate-syntax-cheatsheet.md)** — read this when you need to verify correct namespace, function, or construct syntax; it contains anti-hallucination conversion tables, known-good patterns, and fast debugging heuristics.

## What this skill is for

Use this skill when the user wants to:
- write or refactor `generate_hcl` blocks for Terraform, OpenTofu, or other HCL output
- write or refactor `generate_file` blocks for JSON, YAML, text, scripts, or root-level files
- structure reusable generation logic with `globals`, `lets`, `assert`, `stack_filter`, `condition`, and `inherit`
- use `tm_dynamic` to emit repeated HCL blocks
- understand which Terramate namespaces and functions are valid in a given context
- translate handwritten Terraform/OpenTofu boilerplate into Terramate generation patterns
- debug why a Terramate file fails to parse or why generated output looks wrong
- inspect configuration merging, imports, stack context, root context, and generated file provenance
- use `.tmgen` only when the experimental feature is already enabled and the task is explicitly about ad-hoc blueprint-style generation

Do **not** use this skill for orchestration, Terramate Cloud, stack lifecycle management, or infrastructure deployment.

## Hard safety boundary

This skill is about **code generation and syntax correctness**, not command orchestration.

Never use this skill to run or recommend:
- `terramate run ...`
- `terramate script run ...`
- Terramate Cloud login, sync, drift, or deployment workflows
- Terraform / OpenTofu `apply` or `destroy`
- broad stack-management workflows unless the task is explicitly about generation metadata for an already chosen layout

Do not turn a generation or syntax task into an orchestration task.

## Syntax firewall: prevent Terraform / Terragrunt hallucinations

This section is mandatory. Follow it every time.

1. **Separate Terramate source from generated target code.**
   - In `.tm.hcl` / `.tm`, write only valid Terramate blocks, attributes, namespaces, and `tm_*` functions.
   - Inside `generate_hcl.content`, Terraform/OpenTofu references that Terramate does not know are allowed to pass through into the generated file.
   - Therefore `var.region`, `local.tags`, `module.vpc.id`, `each.value`, `for_each`, Terraform `resource` blocks, and similar target-language constructs are acceptable **inside generated HCL output**, but they are **not** Terramate namespaces or Terramate source-language helpers.

2. **Never invent Terramate functions.**
   - Prefer only documented `tm_*` functions.
   - Do not use bare Terraform-style function names such as `try(...)`, `format(...)`, `contains(...)`, `jsonencode(...)`, `yamlencode(...)`, `templatefile(...)`, `can(...)`, `lookup(...)` inside Terramate expressions.
   - In Terramate source syntax, use `tm_try`, `tm_format`, `tm_contains`, `tm_jsonencode`, `tm_yamlencode`, `tm_templatefile`, `tm_can`, `tm_lookup`, etc.
   - If unsure whether a Terraform function exists in Terramate, do **not** guess. Use a simpler documented expression or leave the target-language expression inside generated HCL instead of inventing a source-language helper.

3. **Never invent Terramate namespaces.**
   - Valid Terramate variable namespaces are `terramate`, `global`, `let`, and `env`.
   - `env` is runtime-only and is not a normal code-generation namespace.
   - Do not invent `var.*`, `local.*`, `locals.*`, `dependency.*`, `include.*`, `path_relative_to_include()`, `inputs`, or similar as Terramate source-language namespaces.

4. **Never assume Terragrunt syntax is valid Terramate syntax.**
   - Terramate is not Terragrunt.
   - Do not write Terragrunt-specific config patterns such as `include`, `inputs`, or `dependency` blocks as if they were native Terramate code-generation constructs.
   - If the user wants Terragrunt interop or Terragrunt migration, keep the Terramate source valid and treat Terragrunt/HCL as target code or as a separate concern.

5. **Choose the context first, then the syntax.**
   - `generate_hcl.content` allows Terramate expressions plus pass-through target HCL.
   - `generate_file.content` must evaluate to a final string.
   - `context = root` and stack context expose different data.
   - `stack_filter` is restricted and does not support Terramate variables or functions.

6. **When uncertain, reduce cleverness.**
   - Prefer explicit `globals` + `lets` + simple `tm_*` helpers.
   - Prefer `generate_file` with `tm_jsonencode` / `tm_yamlencode` for structured text.
   - Prefer `generate_hcl` when pass-through Terraform/OpenTofu expressions must remain intact.
   - Prefer `assert` to catch unsupported assumptions early.

## Defaults and guardrails

1. Prefer the smallest correct generation primitive.
   - Use `generate_hcl` for Terraform, OpenTofu, and other HCL output inside stacks.
   - Use `generate_file` for arbitrary text such as JSON, YAML, shell, Markdown, policy files, or docs.
   - Use `.tmgen` only when the repository already enables the `tmgen` experiment and the user explicitly wants blueprint-style ad-hoc HCL generation.

2. Prefer documented Terramate syntax over analogies.
   - Reach for `globals`, `lets`, `assert`, `condition`, `stack_filter`, `tm_dynamic`, and documented `tm_*` helpers.
   - Do not “port by vibe” from Terraform or Terragrunt.

3. Prefer local, reusable inputs.
   - Put widely shared data in `globals`.
   - Put temporary intermediate expressions in `lets`.
   - Do not pollute `globals` with one-off values needed only by a single generation block.

4. Prefer path targeting over expensive generic conditions.
   - Use `stack_filter` when the targeting rule is mostly path-based.
   - Use `condition` only when metadata or expression-based logic is actually needed.

5. Prefer safe generation scope.
   - Start with `terramate fmt`.
   - Generate from the narrowest relevant directory using `terramate -C <dir> generate` when possible.
   - Use `--detailed-exit-code` when the task is to check whether generation would modify files.

6. Prefer reviewable generated-file conventions.
   - Prefix generated files with `_terramate_generated_` or a similarly obvious name.
   - Never manually edit generated files; edit the source `.tm.hcl`, `.tm`, or `.tmgen` instead.
   - Keep generated files in version control unless the repository has an explicit different convention.

7. Prefer assertions for invariants.
   - Use `assert` to fail generation early when required globals or metadata are missing or invalid.
   - Use `warning = true` only when the missing data should not block generation.

8. Never invent repository context.
   - Verify whether the task is root-level generation or stack-level generation.
   - Verify whether experiments such as `tmgen` are actually enabled.
   - Verify actual stack paths, tags, globals, imports, and file layout before writing targeting logic.

## Terramate source-language rules

Use these rules before writing any snippet.

### Allowed Terramate namespaces

- `terramate` — project / repository / stack metadata, depending on context
- `global` — hierarchical global variables from `globals`
- `let` — block-local variables from `lets`
- `env` — runtime-only environment variables for run/orchestration contexts; do not treat it as a normal code-generation namespace

### Allowed Terramate primitives for this skill

- `generate_hcl`
- `generate_file`
- `globals`
- `lets`
- `assert`
- `import`
- `stack_filter`
- `condition`
- `tm_dynamic`
- documented `tm_*` functions
- `.tmgen` only when the experiment is enabled

### Things to treat as target-language output, not Terramate source

These are often valid **inside generated HCL**, but are not Terramate source-language helpers:
- `var.*`
- `local.*` / `locals`
- `module.*`
- `resource`, `data`, `provider`, `terraform`, `output`, `variable`
- `for_each`, `count`, `dynamic` in Terraform/OpenTofu output
- Terragrunt-style `include`, `inputs`, `dependency`

## Minimal workflow by task

### 1) Review or author standard Terramate generation

Use this path for `.tm.hcl` / `.tm` based generation:

```bash
terramate fmt --detailed-exit-code
terramate -C <relevant-dir> generate --detailed-exit-code
terramate -C <relevant-dir> debug show generate-origins
```

Use this when the task is to write or inspect `generate_hcl` / `generate_file` blocks and confirm what files they affect.

### 2) Create reusable HCL generation for stacks

Use `generate_hcl` when the output is HCL and belongs inside stacks.

Skeleton:

```hcl
generate_hcl "_terramate_generated_main.tf" {
  lets {
    region = tm_try(global.aws.region, "eu-west-1")
  }

  assert {
    assertion = tm_can(global.aws.region)
    message   = "global.aws.region must be defined"
  }

  content {
    provider "aws" {
      region = let.region
    }

    # Terraform/OpenTofu references below are target-language output,
    # so they may pass through unchanged.
    module "example" {
      source = var.module_source
    }
  }
}
```

Use this pattern for provider blocks, backend blocks, shared locals, module wrappers, and repeated HCL fragments.

### 3) Create arbitrary text files

Use `generate_file` when the output is JSON, YAML, shell, Markdown, or any other text file.

Skeleton:

```hcl
generate_file "_terramate_generated_values.json" {
  lets {
    data = tm_jsonencode({
      environment = terramate.stack.name
      region      = global.aws.region
    })
  }

  content = let.data
}
```

Use `context = root` only when the file must be generated at project root rather than within stacks.

### 4) Generate repeated nested HCL blocks

Use `tm_dynamic` inside `generate_hcl.content` when the task is to expand repeated blocks from a list or map.

Skeleton:

```hcl
generate_hcl "_terramate_generated_tags.tf" {
  content {
    tm_dynamic "variable" {
      for_each = global.common_tags
      iterator = tag
      labels   = [tag.key]

      content {
        type    = string
        default = tag.value
      }
    }
  }
}
```

Use this when repeated blocks would otherwise require large amounts of duplicated HCL.

### 5) Use `.tmgen` for ad-hoc HCL generation

Use this only if the repository enables the `tmgen` experiment.

Workflow:

```bash
terramate fmt
terramate -C <relevant-dir> generate --detailed-exit-code
```

Guidelines:
- keep the blueprint in `*.tmgen`
- define shared globals in a normal `.tm.hcl` file such as `config.tm.hcl`
- prefer `.tmgen` when the user already has HCL that only needs light Terramate interpolation

### 6) Debug expressions and syntax behavior

Use these commands when the user wants to understand how Terramate evaluates an expression:

```bash
terramate experimental eval '<expr>'
terramate experimental partial-eval '<expr>'
terramate debug show generate-origins
```

Use `experimental partial-eval` when unknown Terraform/OpenTofu references should remain intact and only Terramate-specific references should be resolved.

## How to choose the right Terramate mechanism

### Prefer `generate_hcl` when:
- the output is HCL
- unknown Terraform/OpenTofu references should survive generation
- partial evaluation is desirable
- you need `tm_dynamic`
- you must keep target-language constructs such as `var.*` or `module.*` in the generated file

### Prefer `generate_file` when:
- the output is plain text rather than structured HCL
- you need JSON or YAML generation with `tm_jsonencode(...)` / `tm_yamlencode(...)`
- the content must evaluate to a final string
- you need `context = root`

### Prefer `.tmgen` when:
- the repository explicitly enables the `tmgen` experiment
- the user already has a nearly-final HCL file and wants to sprinkle in Terramate globals, metadata, or functions
- embedding large HCL snippets inside `generate_hcl` would be less readable than keeping them as blueprints

## Critical syntax distinctions

### `generate_hcl` vs `generate_file`

- `generate_hcl.content` supports Terramate variables and functions and also preserves unknown target-language references through partial evaluation.
- `generate_file.content` must end as a final string.

### Root vs stack context

- `generate_hcl` generates files within stacks.
- `generate_file` defaults to stack context but may use `context = root`.
- In `generate_file`, `context = root` has access to `terramate.root.*`, `terramate.stacks.*`, `tm_*` functions, and interpolation.
- In `generate_file`, stack context adds `global.*` and `terramate.stack.*`.

### Globals vs lets

- `globals` are hierarchical shared data.
- `lets` are local to the surrounding `generate_hcl`, `generate_file`, or `script` block.
- Prefer `lets` for intermediate computations and `globals` for reusable cross-stack configuration.

### Inheritance and targeting

- Generation blocks inherit into child stacks by default.
- Set `inherit = false` only when generation should happen only where the block is declared.
- If `inherit = false` is declared outside a stack directory, it is ignored and Terramate emits a warning.
- Prefer `stack_filter` for path-based targeting across many stacks.
- Use `condition` for metadata- or expression-based targeting.
- `stack_filter` runs before `condition` and is faster.

### Configuration model

- Terramate configuration files use the `tm.hcl` or `tm` suffix.
- All non-hidden Terramate files in the same directory are treated as one merged configuration.
- Many block types merge, but `generate` blocks and `import` blocks are exceptions and do not merge the same way.
- `import` sources must stay inside the project and cannot import parent directories already visible through hierarchy.

### Assertions

Use `assert` whenever generation depends on required inputs. If an assertion is false for a stack, generation for that stack fails and Terramate does not touch files for that stack.

## Hallucination traps and exact corrections

### Trap 1: bare Terraform function names in Terramate source

Wrong:

```hcl
lets {
  value = jsonencode({ env = global.env })
}
```

Correct:

```hcl
lets {
  value = tm_jsonencode({ env = global.env })
}
```

### Trap 2: treating `var.*` as a Terramate variable namespace

Wrong:

```hcl
lets {
  region = var.region
}
```

Correct options:

```hcl
lets {
  region = global.region
}
```

or keep `var.region` in target HCL:

```hcl
generate_hcl "main.tf" {
  content {
    provider "aws" {
      region = var.region
    }
  }
}
```

### Trap 3: using Terragrunt constructs as if they were Terramate config

Wrong:

```hcl
include {
  path = find_in_parent_folders()
}
```

Correct approach:
- use Terramate `import` for Terramate configuration reuse
- use `globals`, `lets`, inheritance, `stack_filter`, or `condition` for Terramate generation logic
- if Terragrunt syntax must exist, emit it as target-language file content instead of pretending it is native Terramate generation syntax

### Trap 4: using `tm_hcl_expression` outside partial-evaluation context

Wrong:

```hcl
generate_file "x.txt" {
  content = tm_hcl_expression("var.foo")
}
```

Correct:
- use `tm_hcl_expression(...)` only inside `generate_hcl.content`
- use plain strings for `generate_file`

### Trap 5: putting variables or functions inside `stack_filter`

Wrong:

```hcl
stack_filter {
  project_paths = ["/${global.env}/**"]
}
```

Correct:
- keep `stack_filter` static and path-based
- move dynamic logic to `condition`

## Troubleshooting rules

1. If Terramate files look inconsistent or parse strangely:
   - run `terramate fmt`
   - inspect the relevant `.tm.hcl` / `.tm` files again
   - verify that the snippet uses Terramate syntax, not Terraform/Terragrunt source syntax by accident

2. If a generated file changed unexpectedly:
   - run `terramate debug show generate-origins`
   - inspect inherited generation blocks in parent directories
   - check `inherit`, `stack_filter`, `condition`, and imported configs

3. If generation affects too many stacks:
   - narrow the working directory with `-C`
   - prefer `stack_filter` over broad conditions
   - check whether a root-level generator is inheriting farther than intended

4. If generation should be blocked for invalid inputs:
   - add an `assert` block
   - keep the message specific and actionable

5. If HCL output should preserve Terraform/OpenTofu expressions:
   - prefer `generate_hcl`
   - avoid forcing full evaluation of expressions that should remain for Terraform/OpenTofu

6. If ad-hoc expression evaluation is confusing:
   - use `terramate experimental partial-eval` for expression debugging
   - use `experimental eval` only when full Terramate evaluation is wanted

7. If a function or namespace feels “probably similar to Terraform/Terragrunt”:
   - stop
   - verify that it is actually documented for Terramate
   - if not documented, do not invent it

## Important gotchas

- Terramate provides Terraform-like built-in functions with a `tm_` prefix and also adds Terramate-specific helpers; do not assume bare Terraform function names are valid Terramate syntax.
- `generate_hcl` uses partial evaluation: Terramate references are resolved, while unknown Terraform/OpenTofu references are preserved in the generated HCL.
- `tm_hcl_expression(...)` is only valid where partial evaluation is allowed, which currently means `generate_hcl.content`.
- `tm_dynamic` is available in `generate_hcl.content`.
- `generate_file` content must evaluate to a final string.
- `stack_filter` does not support Terramate variables or Terramate functions.
- `lets` are local to the enclosing block and are not inherited.
- `inherit = false` outside a stack is ignored with a warning.
- `.tmgen`, `experimental eval`, and `experimental partial-eval` are experimental.
- `experimental eval` and `experimental partial-eval` do not allow filesystem-related functions such as `tm_templatefile`.
- Generated files should usually be committed so reviewers can inspect the effective changes.

## What good output from this skill looks like

A strong result usually includes:
- the right Terramate primitive for the task (`generate_hcl`, `generate_file`, or `.tmgen`)
- Terramate source that uses only documented namespaces and `tm_*` helpers
- a clear distinction between Terramate source syntax and generated target syntax
- explicit assumptions about stack paths, globals, tags, imports, or metadata
- a safe verification path using `terramate fmt`, targeted `terramate generate`, and `debug show generate-origins`
- generated file names that make provenance obvious
- no invented Terraform/Terragrunt-like helpers masquerading as Terramate syntax

