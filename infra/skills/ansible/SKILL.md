---
name: ansible
description: >
  Work with Ansible via the standard CLI to inspect inventory, understand configuration,
  look up modules, write or update playbooks and roles, verify targeting, validate syntax,
  preview changes with check/diff, manage collections and vault-encrypted variables, and
  execute targeted playbooks safely. Use this skill when the user asks to write, explain,
  debug, review, refactor, or run Ansible playbooks, inventories, roles, host patterns,
  ad-hoc commands, collections, or vault workflows. Also use it when converting shell
  steps into idempotent Ansible tasks. NOT for AWX/Tower/AAP job templates, Kubernetes
  operators, or non-Ansible orchestration systems.
metadata: {"openclaw":{"requires":{"bins":["ansible-playbook","ansible-inventory","ansible-doc","ansible-config","ansible-vault"]},"emoji":"⚙️"}}
---

# Ansible

Use this skill for day-to-day Ansible work through the normal CLI: inspect inventory,
check config, look up modules, write or fix playbooks, preview impact, and run narrowly
scoped automation with safe defaults.

## Hard safety boundary

- Never run against `all` or a broad production group unless the user explicitly asked for that scope.
- Prefer `--limit` for any risky, disruptive, or uncertain run.
- Prefer `--check` before a real run when modules support it.
- Prefer `--diff` only when it adds value and avoid it for secrets or large fan-out runs.
- Never print vault secrets, decrypted secret files, or raw secret values back to the user.
- Do not use `shell`, `command`, or `raw` when there is a suitable Ansible module.
- Do not use ad-hoc commands for multi-step, reusable, or stateful workflows; write a playbook instead.
- Do not add `ignore_errors: true` or `changed_when: true/false` as a shortcut unless there is a clear, justified reason.
- For higher-risk changes, prefer a staged rollout with `serial:` in the play and a narrow `--limit` on the CLI.

## Safe default workflow

1. Understand the scope.
   - Identify the inventory source, target pattern, connection method, and whether privilege escalation is needed.
   - Confirm whether the task is read-only inspection, a dry-run preview, or a real change.

2. Inspect inventory before touching a playbook.
   - Show structure:
     - `ansible-inventory -i <inventory> --graph`
   - Show resolved inventory data:
     - `ansible-inventory -i <inventory> --list`
   - If inventory-relative files such as `group_vars/` or roles matter and no playbook is being used, add:
     - `--playbook-dir <repo-root>`

3. Inspect configuration and module behavior.
   - Show effective non-default config:
     - `ansible-config dump --only-changed`
   - Look up a module or plugin before writing YAML:
     - `ansible-doc ansible.builtin.copy`
     - `ansible-doc -l | grep <keyword>`
   - Prefer fully-qualified collection names (FQCN), especially when a module might exist in multiple collections.

4. Write or update Ansible content using idempotent modules first.
   - Prefer built-in or collection modules over shelling out.
   - Keep variables in `group_vars/`, `host_vars/`, role defaults/vars, or dedicated var files.
   - Put secrets in Ansible Vault rather than plaintext files or inline literals.

5. Validate the playbook before execution.
   - Syntax only:
     - `ansible-playbook -i <inventory> <playbook>.yml --syntax-check`
   - See host targeting:
     - `ansible-playbook -i <inventory> <playbook>.yml --list-hosts`
   - See task expansion:
     - `ansible-playbook -i <inventory> <playbook>.yml --list-tasks`
   - When tags matter:
     - `ansible-playbook -i <inventory> <playbook>.yml --list-tags`

6. Lint before preview when ansible-lint is available.
   - ansible-lint lives in the workspace venv: `~/.openclaw/workspace-devops/.venv/bin/ansible-lint`
   - Requires a `.ansible-lint` config file in the project root (otherwise it may fail traversing to `/root`):
     ```yaml
     profile: min
     skip_list: []
     ```
   - `~/.openclaw/workspace-devops/.venv/bin/ansible-lint <playbook>.yml`
   - Fix reported issues before proceeding to check mode.

7. Preview changes safely.
   - Use check mode first:
     - `ansible-playbook -i <inventory> <playbook>.yml --check`
   - Add `--diff` only when useful and safe:
     - `ansible-playbook -i <inventory> <playbook>.yml --check --diff --limit <one-host-or-small-group>`
   - Be aware that some tasks may skip, behave differently, or have limited predictive value in check mode.

8. Execute narrowly.
   - Start with the smallest correct scope:
     - `ansible-playbook -i <inventory> <playbook>.yml --limit <host-or-group>`
   - Add privilege escalation only if required:
     - `-b` and possibly `-K`
   - For troubleshooting, consider:
     - `-v`, `-vv`, or `-vvv`
     - `--start-at-task '<task name>'`
     - `--step`

## Defaults

- Default to playbooks, not ad-hoc commands, for anything reusable or more than one step.
- Default to explicit inventory with `-i <inventory>`.
- Default to FQCN in tasks, for example `ansible.builtin.copy` instead of bare `copy`.
- Default to preview-first: `--syntax-check`, `--list-hosts`, `--list-tasks`, then `--check`, then a narrow real run.
- Default to `--limit <target>` for anything nontrivial.
- Default to vault for secrets.

## Common command patterns

### Inventory and targeting

- Inventory graph:
  - `ansible-inventory -i inventory.yml --graph`
- Full resolved inventory:
  - `ansible-inventory -i inventory.yml --list`
- Verify the hosts a play would target:
  - `ansible-playbook -i inventory.yml site.yml --list-hosts`

### Module lookup

- Read module docs:
  - `ansible-doc ansible.builtin.template`
- Search installed modules/plugins:
  - `ansible-doc -l | grep template`

### Validation and preview

- Syntax check:
  - `ansible-playbook -i inventory.yml site.yml --syntax-check`
- List tasks:
  - `ansible-playbook -i inventory.yml site.yml --list-tasks`
- Dry run with diff on a narrow target:
  - `ansible-playbook -i inventory.yml site.yml --check --diff --limit web-01`

### Execution

- Narrow, real execution:
  - `ansible-playbook -i inventory.yml site.yml --limit web-01`
- Become when required:
  - `ansible-playbook -i inventory.yml site.yml --limit web-01 -b`
- Restart from a task:
  - `ansible-playbook -i inventory.yml site.yml --start-at-task 'Render nginx config'`

### Ad-hoc commands

Use ad-hoc only for one-off simple actions or inspection.

- Ping connectivity:
  - `ansible all -i inventory.yml -m ping --limit <target>`
- Gather facts:
  - `ansible <target> -i inventory.yml -m setup`
- One-off package action when a proper playbook is not warranted:
  - `ansible <target> -i inventory.yml -m ansible.builtin.package -a 'name=curl state=present'`

Do not convert complex workflows into long ad-hoc commands.

### Vault and secrets

- Create a new encrypted file:
  - `ansible-vault create group_vars/production/vault.yml`
- Encrypt an existing file:
  - `ansible-vault encrypt group_vars/production/vault.yml`
- Edit an encrypted file:
  - `ansible-vault edit group_vars/production/vault.yml`
- View without decrypting to disk:
  - `ansible-vault view group_vars/production/vault.yml`
- Re-encrypt with a new password:
  - `ansible-vault rekey group_vars/production/vault.yml`
- Create an encrypted variable for embedding in YAML:
  - `ansible-vault encrypt_string --name <var_name> '<secret>'`
- Never echo decrypted secret content back into the conversation.

### Collections and roles

- When a module is missing, identify the collection first, then install it deliberately.
- Prefer explicit collection references in YAML.
- Keep reusable content in roles with a conventional role structure.
- Initialize a new role skeleton:
  - `ansible-galaxy role init <role-name>`
- Install a collection from Galaxy:
  - `ansible-galaxy collection install <namespace.collection>`
- Install from a requirements file:
  - `ansible-galaxy collection install -r requirements.yml`

## Authoring rules

### Prefer idempotent modules

When turning shell steps into Ansible:
- First look for a purpose-built module.
- Use `template`, `copy`, `file`, `package`, `service`, `user`, `group`, `git`, `lineinfile`, `blockinfile`, and similar modules before `shell` or `command`.
- Use handlers for service restarts instead of unconditional restart commands in the middle of tasks.

### Prefer explicit scoping

- Make `hosts:` precise.
- Use tags only when they simplify safe operation and debugging.
- Keep variables close to the right scope.
- Use `serial:` for rolling changes on larger groups. Example for a staged rollout:
  ```yaml
  - hosts: web
    serial: "25%"
    tasks:
      - name: Deploy app
        ansible.builtin.copy:
          src: app.tar.gz
          dest: /opt/app/
  ```

### Prefer clear YAML and module semantics

- Use one task for one meaningful state transition.
- Name tasks clearly.
- Keep Jinja readable; avoid deeply nested inline logic when a variable or template file would be clearer.
- Use `register:` only when later logic actually needs the result.

## Gotchas

- `--check` is predictive, not perfect. Some tasks skip or cannot fully model the real result.
- `--diff` can expose sensitive data and can generate a lot of output; use it carefully.
- Inventory behavior depends on the inventory source and sometimes on the playbook base directory.
- Bare module names can resolve ambiguously across collections; prefer FQCN.
- A play that works on one host may still be unsafe at larger scale; use `--limit` and `serial:`.
- Ad-hoc commands are not a substitute for a readable playbook.
- `become` changes privilege context; do not add it unless the task actually requires it.

## Troubleshooting workflow

1. Confirm CLI/config environment.
   - `ansible-playbook --version`
   - `ansible-config dump --only-changed`

2. Confirm inventory resolution.
   - `ansible-inventory -i <inventory> --graph`
   - `ansible-inventory -i <inventory> --list`

3. Confirm target selection.
   - `ansible-playbook -i <inventory> <playbook>.yml --list-hosts`

4. Confirm syntax and task expansion.
   - `ansible-playbook -i <inventory> <playbook>.yml --syntax-check`
   - `ansible-playbook -i <inventory> <playbook>.yml --list-tasks`

5. Run a narrow preview.
   - `ansible-playbook -i <inventory> <playbook>.yml --check --limit <host>`

6. Increase verbosity only as needed.
   - `-v` → `-vv` → `-vvv`

7. For module uncertainty, inspect docs instead of guessing.
   - `ansible-doc <fqcn>`

## What not to do

- Do not guess module arguments or collection names when `ansible-doc` can confirm them.
- Do not store plaintext secrets in repo files, inline vars, or chat output.
- Do not run a wide-scope playbook just because syntax check passed.
- Do not use `shell` just to mimic an imperative script when Ansible modules already model the desired state.
- Do not rely on implicit inventory or implicit module resolution when explicit forms are available.

