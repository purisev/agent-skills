# agent-skills

Skills for Claude Code and Codex, packaged as plugins of the `purisev` marketplace. Install them with
the [purisev installer](https://ai-plugins.purisev.com) or by hand:

```
/plugin marketplace add purisev/agent-plugins                 # Claude Code
/plugin install infra@purisev

codex plugin marketplace add purisev/agent-plugins            # Codex
codex plugin add infra@purisev
```

| Plugin | Skills |
| --- | --- |
| [`infra`](infra) | `ansible`, `helm`, `metricsql`, `terraform` (preflight only: no `apply`, `destroy` or state changes), `terramate` |
| [`playwright`](playwright) | `playwright`, by Ivan G. Davila (Clawic); see [playwright/NOTICE.md](playwright/NOTICE.md) |

Each plugin directory holds a `.claude-plugin/plugin.json` and a `.codex-plugin/plugin.json` with the
same `name` and `version`, and its skills under `skills/<skill>/SKILL.md`. The catalogs in
[purisev/agent-plugins](https://github.com/purisev/agent-plugins) take each directory through a
`git-subdir` source; this repository has no marketplace of its own.

Raise `version` in both manifests of a plugin with every change to it: Claude Code tells plugin
versions apart by that field.

## License

MIT, except `playwright/skills/playwright`, which carries its author's MIT license in
[playwright/LICENSE](playwright/LICENSE).
