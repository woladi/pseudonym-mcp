#!/usr/bin/env node
/**
 * Propagates the version in package.json to every other place that carries a
 * copy of it: the MCP registry manifest (server.json — both the server version
 * and the npm package version it points at), the runtime constant the CLI and
 * the MCP server report to clients (src/version.ts), and the root entry of the
 * lockfile.
 *
 * Runs as part of `npm run version-packages`, so the "version packages" PR that
 * changesets opens already contains the synced files and the registry publish
 * step has nothing left to fix up at release time.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import prettier from 'prettier'

const read = (p) => JSON.parse(readFileSync(p, 'utf8'))

const { version } = read('package.json')

const writeFormatted = async (path, source) => {
  const options = await prettier.resolveConfig(path)
  writeFileSync(path, await prettier.format(source, { ...options, filepath: path }))
}

// server.json is hand-maintained and prettier-formatted. Feed prettier the
// indented form (its JSON printer preserves object expansion but collapses
// short arrays), so a version bump touches the version lines and nothing else.
const server = read('server.json')
server.version = version
for (const pkg of server.packages ?? []) pkg.version = version
await writeFormatted('server.json', JSON.stringify(server, null, 2))

// src/version.ts is the single runtime source of truth — a stale value here is
// invisible in tests but makes the published server lie about itself over MCP.
const versionModule = readFileSync('src/version.ts', 'utf8')
const bumped = versionModule.replace(/(export const APP_VERSION = )'[^']*'/, `$1'${version}'`)
if (bumped === versionModule && !versionModule.includes(`'${version}'`)) {
  console.error('src/version.ts: could not find an APP_VERSION assignment to update')
  process.exit(1)
}
await writeFormatted('src/version.ts', bumped)

// npm writes lockfiles as JSON.stringify(…, 2) + newline; match it exactly.
const lock = read('package-lock.json')
lock.version = version
if (lock.packages?.['']) lock.packages[''].version = version
writeFileSync('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`)

console.log(`synced server.json, src/version.ts and package-lock.json to ${version}`)
