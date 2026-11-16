# Terramate Syntax Cheatsheet

This reference is for **writing Terramate source correctly** in `.tm.hcl` / `.tm` files.

Its main purpose is to prevent a common failure mode: **mixing up Terramate source syntax with Terraform/OpenTofu/Terragrunt syntax**.

---

## Mental model: always separate the two languages

When you write Terramate code, there are often **two different languages** involved:

1. **Terramate source language**
   - lives in `.tm.hcl` / `.tm`
   - evaluated by Terramate
   - can use `terramate.*`, `global.*`, `let.*`, and `tm_*` functions in supported contexts

2. **Generated target code**
   - usually Terraform/OpenTofu HCL, JSON, YAML, shell, or text
   - emitted by `generate_hcl` or `generate_file`
   - may intentionally contain references that Terramate does **not** evaluate, such as `var.foo`, `local.bar`, `path.module`, `upper(local.name)`, etc.

**Rule:** before writing anything, decide whether a given expression belongs to:
- Terramate evaluation time, or
- generated output time.

If you mix them up, you will usually get either invalid Terramate code or silently wrong generated files. Terramate uses **partial evaluation** for `generate_hcl`: Terramate-known references are evaluated, while unknown references/functions are copied through to the generated HCL. citeturn694114view0turn111929view2

---

## File and config basics

Terramate configuration files use the suffixes:
- `*.tm.hcl`
- `*.tm`

All non-hidden Terramate files in the same directory are treated as a single merged configuration. Blocks can often be defined multiple times and merged when supported. citeturn694114view4

### Good

```hcl
# terramate.tm.hcl
terramate {
  required_version = ">= 0.13"
}
```

```hcl
# globals.tm.hcl
globals {
  region = "eu-west-1"
}
```

### Bad assumption

"Each file is isolated like a separate Terraform module file."

It is not. Within one directory, Terramate reads the files as one configuration set and merges supported blocks. citeturn694114view4

---

## Variable namespaces: what is actually valid

In Terramate, the main namespaces you should think about are:
- `terramate.*`
- `global.*`
- `let.*`

Terramate docs describe:
- `terramate` as metadata/project and stack metadata namespace
- `global` as globals defined by `globals {}`
- `let` as local context-based variables inside supported blocks. citeturn569323search0turn111929view1turn111929view3

### Valid examples

```hcl
globals {
  region = "eu-west-1"
}

generate_hcl "provider.tf" {
  lets {
    is_prod = terramate.stack.name == "prod"
  }

  content {
    provider "aws" {
      region = global.region
    }
  }
}
```

### Invalid Terramate mental model

Do **not** assume these are native Terramate namespaces:

```hcl
var.env
local.name
module.vpc
path.module
inputs.region
dependency.vpc.outputs.id
include.root.locals.region
```

These may be valid in the **generated Terraform/Terragrunt output**, but they are **not** Terramate variable namespaces.

---

## Functions: use `tm_*`, not bare Terraform functions

Terramate provides Terraform v0.15.13-style built-in functions, but **prefixed with `tm_`**. Examples:
- `tm_try(...)`
- `tm_jsonencode(...)`
- `tm_length(...)`
- `tm_upper(...)`

This is one of the most important anti-hallucination rules. Terramate docs explicitly state that Terramate built-ins are Terraform-style functions with the `tm_` prefix. citeturn694114view2

### Correct in Terramate evaluation context

```hcl
globals {
  tags_json = tm_jsonencode({
    env = "prod"
  })
}
```

```hcl
lets {
  region = tm_try(global.aws.region, "eu-west-1")
}
```

### Wrong in Terramate evaluation context

```hcl
jsonencode({ env = "prod" })
try(global.aws.region, "eu-west-1")
length(global.list)
upper(global.name)
```

### Important nuance

Inside `generate_hcl`, an **unknown function** such as `upper(local.name)` can be intentionally left untouched and copied into generated HCL. But if the function is supposed to be evaluated by Terramate itself, use `tm_upper(...)`. citeturn694114view0

### Safe rule

- Use `tm_*` when you want Terramate to evaluate the function.
- Use bare `upper(...)`, `merge(...)`, etc. only if you intentionally want them to remain in generated Terraform/OpenTofu HCL.

---

## `generate_hcl` vs `generate_file`

### Use `generate_hcl` when
- the target output is HCL
- you want partial evaluation
- you want unknown Terraform/OpenTofu references preserved
- you need `tm_dynamic`

Terramate docs say `generate_hcl.content` supports Terramate namespaces `terramate`, `global`, and `let`, and uses partial evaluation. citeturn111929view2turn694114view0

### Use `generate_file` when
- the target output is plain text, JSON, YAML, shell, or Markdown
- you want the final value to be a string
- you may need `context = root`

Terramate docs state that `generate_file.content` must evaluate to a valid string. In `context=root`, it can use `terramate.root.*`, `terramate.stacks.*`, `tm_*` functions, and interpolation; in `context=stack`, it also gets `global.*` and `terramate.stack.*`. citeturn111929view0

### Good examples

```hcl
generate_hcl "backend.tf" {
  content {
    terraform {
      backend "s3" {}
    }
  }
}
```

```hcl
generate_file "data.json" {
  content = tm_jsonencode({
    stack = terramate.stack.name
    env   = global.environment
  })
}
```

### Common mistake

Using `generate_file` to emit HCL that should preserve Terraform expressions.

That usually leads to awkward string assembly. Prefer `generate_hcl` for HCL output. citeturn111929view0turn111929view2

---

## Partial evaluation: what Terramate evaluates and what it leaves alone

In `generate_hcl`, Terramate evaluates what it knows and copies through what it does not know.

### Example

```hcl
globals {
  region = "eu-west-1"
}

generate_hcl "main.tf" {
  content {
    resource "example" "this" {
      enabled = var.enabled
      region  = global.region
      name    = local.name
    }
  }
}
```

This is valid because:
- `global.region` is Terramate data and will be resolved
- `var.enabled` and `local.name` are not Terramate namespaces and may remain in the generated HCL

This is exactly the kind of case where models often panic and try to “fix” `var.*` or `local.*`. Do **not** do that when the target is generated Terraform/OpenTofu code. citeturn694114view0turn111929view2

### But do not overgeneralize

Partial evaluation does **not** mean “any Terraform-like thing is valid everywhere in Terramate.”

It mainly applies inside places that support partial evaluation, especially `generate_hcl.content`. It does **not** mean you can use Terraform/Terragrunt syntax as first-class Terramate config everywhere. `tm_hcl_expression()` is an explicit example of something only allowed where partial evaluation is supported, currently only `generate_hcl.content`. citeturn694114view3

---

## `tm_hcl_expression()`: very narrow tool

`tm_hcl_expression(string)` returns an expression, not a final evaluated scalar value. It is only allowed in contexts where partial evaluation is supported — currently only `generate_hcl.content`. citeturn694114view3

### Good

```hcl
generate_hcl "expr.tf" {
  content {
    expr = tm_hcl_expression("data.aws_caller_identity.current.account_id")
  }
}
```

### Bad

```hcl
globals {
  expr = tm_hcl_expression("var.name")
}
```

```hcl
generate_file "bad.txt" {
  content = tm_hcl_expression("var.name")
}
```

### Safe rule

Use `tm_hcl_expression()` only when building generated HCL expressions that cannot be expressed cleanly as ordinary Terramate expressions inside `generate_hcl.content`. citeturn694114view3

---

## `globals` vs `lets`

### Use `globals` for
- hierarchical shared values
- values reused across multiple stacks or directories
- project-wide conventions

Terramate globals use hierarchical merge semantics and are lazily evaluated in stack context. They live in `global.*`. citeturn211093search8

### Use `lets` for
- temporary intermediate values
- local computation inside a single `generate_hcl`, `generate_file`, or similar block
- keeping the global namespace clean

Terramate lets are local to the parent block, are never inherited in child directories, and are available in supported contexts such as `generate_hcl` and `generate_file`. citeturn111929view1

### Good

```hcl
globals {
  region = "eu-west-1"
}

generate_hcl "provider.tf" {
  lets {
    provider_alias = "primary"
  }

  content {
    provider "aws" {
      alias  = let.provider_alias
      region = global.region
    }
  }
}
```

### Bad style

```hcl
globals {
  provider_alias = "primary"
}
```

Use a global only if it is truly shared configuration.

---

## `context = root` is not the same as stack context

Code generation has two execution contexts:
- `stack`
- `root`

Terramate docs describe that stack context exposes more features, while root context gives access to project metadata, functions, and lets. For `generate_file`, root context specifically gets `terramate.root.*`, `terramate.stacks.*`, `tm_*`, and interpolation; stack context additionally gets `global.*` and `terramate.stack.*`. citeturn569323search4turn111929view0

### Good root example

```hcl
generate_file "stacks.json" {
  context = root
  content = tm_jsonencode({
    stacks = terramate.stacks.list
    root   = terramate.root.path.fs.basename
  })
}
```

### Bad assumption

```hcl
generate_file "stacks.json" {
  context = root
  content = tm_jsonencode({
    region = global.region
    stack  = terramate.stack.name
  })
}
```

In root context, do not assume stack-only data is available the same way. Use root/project metadata only unless the docs explicitly allow more. citeturn111929view0

---

## `stack_filter`: path filters only, no variables/functions

`stack_filter` is often misunderstood. In Terramate generation, it is a **path-based filter** and it does **not** support Terramate functions or Terramate variables. Terramate docs say this explicitly for both `generate_hcl` and `generate_file`. citeturn111929view2turn569323search9

### Good

```hcl
generate_hcl "network.tf" {
  stack_filter {
    project_paths = ["/stacks/networking/**"]
  }

  content {
    locals {
      area = "networking"
    }
  }
}
```

### Bad

```hcl
generate_hcl "network.tf" {
  stack_filter {
    project_paths = [global.stack_path]
  }

  content {
    locals {
      area = "networking"
    }
  }
}
```

```hcl
generate_hcl "network.tf" {
  stack_filter {
    project_paths = [tm_format("/stacks/%s/**", global.area)]
  }

  content {
    locals {
      area = "networking"
    }
  }
}
```

### What to do instead

- Use literal glob patterns in `stack_filter`.
- Use `condition = ...` when you need expression-based logic. `condition` can use Terramate variables and functions and is evaluated after `stack_filter`. citeturn111929view2

---

## `condition` vs `stack_filter`

Use:
- `stack_filter` for fast, simple path targeting
- `condition` for boolean logic using Terramate data/functions

Terramate docs note that `stack_filter` takes precedence and is executed first for performance reasons. `condition` must evaluate to a boolean, and when false the `content` block is not evaluated. citeturn111929view2

### Good

```hcl
generate_hcl "tags.tf" {
  condition = tm_length(global.common_tags) > 0

  content {
    locals {
      common_tags = global.common_tags
    }
  }
}
```

---

## `tm_dynamic`: for repeated HCL blocks, not for arbitrary text templating

`tm_dynamic` is available inside `generate_hcl.content` and is meant for generating repeated HCL blocks. It supports `for_each`, `iterator`, `labels`, `attributes`, `content`, and an optional `condition`. Unknown non-Terramate references are copied through in the generated HCL. citeturn111929view2

### Good

```hcl
globals {
  tags = {
    env   = "prod"
    owner = "platform"
  }
}

generate_hcl "locals.tf" {
  content {
    tm_dynamic "locals" {
      condition = tm_length(global.tags) > 0

      content {
        common_tags = global.tags
      }
    }
  }
}
```

### Bad assumption

Using `tm_dynamic` as if it were a general-purpose loop for `generate_file` text output.

It is an HCL-generation construct; use `generate_file` plus string/JSON construction for arbitrary text. citeturn111929view2

---

## Assertions: prefer fail-fast over silent broken output

You can define `assert` blocks inside `generate_hcl` and `generate_file`, and assertions can access locally scoped data such as `let.*`. This is the correct way to stop generation when required metadata or globals are missing. citeturn569323search18

### Good

```hcl
generate_hcl "provider.tf" {
  lets {
    has_region = tm_can(global.aws.region)
  }

  assert {
    assertion = let.has_region
    message   = "global.aws.region must be defined"
  }

  content {
    provider "aws" {
      region = global.aws.region
    }
  }
}
```

---

## Imports are Terramate imports, not Terragrunt include semantics

Terramate supports `import { source = ... }` for importing Terramate configuration files. The source must point to files inside the project, supports globs, imported files are handled as if they were in the importing file's directory, and cycles are not allowed. This is **not** the same thing as Terragrunt `include` semantics. citeturn694114view4

### Good

```hcl
import {
  source = "/imports/common.tm.hcl"
}
```

### Do not hallucinate Terragrunt-native patterns as Terramate config

```hcl
include "root" {
  path = find_in_parent_folders()
}

inputs = {
  region = "eu-west-1"
}

dependency "vpc" {
  config_path = "../vpc"
}
```

Those are Terragrunt concepts, not native Terramate syntax for code generation.

---

## Anti-hallucination conversion table

### Terraform / OpenTofu idea → Terramate-safe way

| What the model may try | Why it is wrong in Terramate source | Prefer this instead |
|---|---|---|
| `jsonencode(...)` | Terramate functions are `tm_*` | `tm_jsonencode(...)` |
| `try(...)` | Same problem | `tm_try(...)` |
| `length(...)` | Same problem | `tm_length(...)` |
| `upper(...)` to be evaluated by Terramate | Bare function call is not a Terramate built-in | `tm_upper(...)` |
| `var.foo` as Terramate input | `var.*` is not a Terramate namespace | use `global.foo`, `let.foo`, or keep `var.foo` only inside generated HCL |
| `local.bar` as Terramate local | Terramate uses `lets` / `let.*` | `lets { bar = ... }` then `let.bar` |
| `path.module` as Terramate metadata | wrong namespace | use `terramate.root.*` / `terramate.stack.*` as appropriate |
| `for_each` loop like Terraform in top-level Terramate config | wrong construct | use `tm_dynamic` in `generate_hcl`, or normal Terramate expressions/conditions |
| using functions/variables inside `stack_filter` | unsupported | use literal glob patterns, move logic into `condition` |

### Terragrunt idea → Terramate-safe way

| What the model may try | Why it is wrong in Terramate source | Prefer this instead |
|---|---|---|
| `include` blocks for inheritance | not Terramate codegen syntax | Terramate hierarchy + `globals` + `import` + inherited generation blocks |
| `inputs = {...}` as first-class stack input system | not Terramate codegen syntax | generate files or use globals/metadata |
| `dependency` blocks | not native Terramate code generation syntax | use generated target code or Terramate outputs-sharing only when intentionally using that separate feature |
| `find_in_parent_folders()` | Terragrunt function, not Terramate syntax | use Terramate hierarchy/project root metadata/imports |

---

## Safe authoring checklist

Before finalizing Terramate code, check each item:

1. Am I writing **Terramate source** or **generated target code**?
2. If Terramate should evaluate a function, did I use a `tm_*` function?
3. If I used `var.*`, `local.*`, `module.*`, `path.*`, is that intentionally for generated Terraform/OpenTofu HCL rather than Terramate evaluation?
4. Did I choose `generate_hcl` for HCL and `generate_file` for text output?
5. If I used `context = root`, am I avoiding stack-only assumptions?
6. If I used `stack_filter`, are all patterns literal globs rather than expressions?
7. If a required input may be missing, did I add an `assert`?
8. If I used `tm_hcl_expression()`, is it only inside `generate_hcl.content`?
9. Did I use `lets` for local temporary values instead of polluting `globals`?
10. Am I accidentally writing Terragrunt syntax instead of Terramate syntax?

---

## Minimal “known-good” patterns

### Pattern: shared Terraform provider HCL

```hcl
globals {
  aws = {
    region = "eu-west-1"
  }
}

generate_hcl "_terramate_generated_provider.tf" {
  assert {
    assertion = tm_can(global.aws.region)
    message   = "global.aws.region must be defined"
  }

  content {
    provider "aws" {
      region = global.aws.region
    }
  }
}
```

### Pattern: root-level JSON inventory

```hcl
generate_file "stacks.json" {
  context = root

  content = tm_jsonencode({
    root   = terramate.root.path.fs.basename
    stacks = terramate.stacks.list
  })
}
```

### Pattern: preserve Terraform references intentionally

```hcl
globals {
  owner = "platform"
}

generate_hcl "_terramate_generated_tags.tf" {
  content {
    locals {
      owner        = global.owner
      computed_env = var.environment
      name         = upper(local.base_name)
    }
  }
}
```
```

In this pattern:
- `global.owner` is evaluated by Terramate
- `var.environment` remains Terraform/OpenTofu code
- `upper(local.base_name)` remains target-language code unless you intentionally replace it with a Terramate-evaluated `tm_upper(...)` on Terramate-managed data

---

## Fast debugging heuristics

If Terramate code looks wrong, ask these questions in order:

1. Is the error caused by writing Terraform/Terragrunt syntax in Terramate source?
2. Did I forget the `tm_` prefix on a function that Terramate must evaluate?
3. Am I using stack-only data in `context = root`?
4. Did I put expressions inside `stack_filter` even though it only accepts literal glob-like patterns?
5. Am I using `tm_hcl_expression()` outside `generate_hcl.content`?
6. Should this be a `let`, a `global`, or a literal that belongs in generated output instead?

---

## One-sentence golden rule

**In Terramate source, only use Terramate namespaces and `tm_*` functions unless you are deliberately emitting target-language code that should survive partial evaluation.**

