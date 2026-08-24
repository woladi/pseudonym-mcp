# Changesets

Every change that should reach npm needs a changeset — a small markdown file
describing the bump and what to put in the changelog:

```bash
npm run changeset
```

Pick `patch` / `minor` / `major`, write one line in the user's language (it is
copied verbatim into `CHANGELOG.md`), and commit the generated file together
with the code.

On merge to `master` the release workflow collects pending changesets into a
"version packages" PR that bumps `package.json`, `server.json`,
`src/version.ts` and the changelog. Merging **that** PR is what publishes to
npm and to the MCP registry.

Chore-only work (CI, docs, refactors with no user-visible effect) needs no
changeset — no changeset simply means no release.

Full docs: https://github.com/changesets/changesets
