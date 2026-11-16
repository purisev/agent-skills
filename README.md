# agent-skills

Skills for Claude Code and Codex, packaged as plugins of the `purisev` marketplace. Install them with
the [purisev installer](https://ai-plugins.purisev.com) or by hand:

```
/plugin marketplace add purisev/agent-plugins                 # Claude Code
/plugin install infra@purisev

codex plugin marketplace add purisev/agent-plugins            # Codex
codex plugin add infra@purisev
```

| Directory | Skills | Claude Code installs | Codex installs |
| --- | --- | --- | --- |
| [`infra`](infra) | `ansible`, `helm`, `metricsql`, `terraform` (preflight only: no `apply`, `destroy` or state changes), `terramate` | this directory | this directory |
| [`humanizer`](humanizer) | `humanizer`, by Siqi Chen | [blader/humanizer](https://github.com/blader/humanizer) | this directory |
| [`playwright`](playwright) | `playwright`, by Ivan G. Davila (Clawic) | [clawic/skills](https://github.com/clawic/skills/tree/main/skills/playwright) | this directory |

`infra` is maintained here. It has a `.claude-plugin/plugin.json` and a `.codex-plugin/plugin.json`
with the same `name` and `version`; raise `version` in both with every change, because Claude Code
tells plugin versions apart by that field.

`humanizer` and `playwright` are third-party skills, copied here for Codex only. Codex finds skills
only in a plugin with a manifest and a `skills/` directory, which their sources do not have. Each
directory carries the author's license, a `NOTICE.md`, and an `upstream.json` with the commit the copy
was taken from. Claude Code installs the same commit from the source, as pinned in the catalog.

The catalogs in [purisev/agent-plugins](https://github.com/purisev/agent-plugins) take each directory
through a `git-subdir` source; this repository has no marketplace of its own.

## Updating a third-party skill

1. Copy the skill's files from the new commit into `<plugin>/skills/<plugin>/`, keeping a `name` that
   is a valid skill name.
2. Set `ref` and `sha` in `<plugin>/upstream.json`, and the upstream version in
   `<plugin>/.codex-plugin/plugin.json` and `NOTICE.md`.
3. Set the same `ref` and `sha` on the plugin's entry in `.claude-plugin/marketplace.json` of
   purisev/agent-plugins.

`node --test` checks that each copy matches its source at the pinned commit, apart from `name`, and
that the purisev catalog pins Claude Code to the same commit. It needs `git` and network access.

## License

MIT, except `humanizer/skills` and `playwright/skills`, which carry their authors' MIT licenses in
`humanizer/LICENSE` and `playwright/LICENSE`.
