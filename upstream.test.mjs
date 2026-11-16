import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

// A wrapper repackages a third-party skill for Codex, which finds skills only in a plugin with a
// manifest and a skills/ directory. Claude Code installs the same skill from its source, pinned in the
// purisev catalog, so both must name the same commit and the copy must match that commit.
const CATALOG = "https://raw.githubusercontent.com/purisev/agent-plugins/main/.claude-plugin/marketplace.json";
const root = new URL(".", import.meta.url).pathname;
const wrappers = readdirSync(root).filter((dir) => existsSync(join(root, dir, "upstream.json")));

// The only edit a copy may carry: a `name` that Claude Code and Codex use as the skill name.
const withoutName = (text) => text.replace(/^name: .*$/m, "");

const checkout = (upstream) => {
  const dir = mkdtempSync(join(tmpdir(), "upstream-"));
  const git = (...args) => execFileSync("git", ["-C", dir, ...args], { stdio: "pipe" });
  git("init", "-q");
  git("fetch", "-q", "--depth", "1", upstream.url, upstream.sha);
  git("checkout", "-q", "FETCH_HEAD");
  return dir;
};

for (const name of wrappers) {
  const upstream = JSON.parse(readFileSync(join(root, name, "upstream.json"), "utf-8"));
  const copy = join(root, name, "skills", name);

  test(`${name}: the copy matches ${upstream.url} at ${upstream.sha}`, (t) => {
    const dir = checkout(upstream);
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const source = join(dir, upstream.path);
    for (const file of readdirSync(copy, { recursive: true })) {
      const ours = readFileSync(join(copy, file), "utf-8");
      const theirs = readFileSync(join(source, file), "utf-8");
      assert.equal(withoutName(ours), withoutName(theirs), `${file} differs from the source`);
    }
    if (upstream.path) {
      for (const file of readdirSync(source).filter((f) => f.endsWith(".md"))) {
        assert.ok(existsSync(join(copy, file)), `${file} from the source is missing`);
      }
    }
  });

  test(`${name}: the purisev catalog pins Claude Code to the same commit`, async (t) => {
    const catalog = await (await fetch(CATALOG)).json();
    const entry = catalog.plugins.find((plugin) => plugin.name === name);
    if (!entry) return t.skip("not listed in the catalog");
    const url = entry.source.repo ? `https://github.com/${entry.source.repo}.git` : entry.source.url;
    assert.equal(url, upstream.url);
    assert.equal(entry.source.path ?? "", upstream.path);
    assert.equal(entry.source.sha, upstream.sha);
  });
}
