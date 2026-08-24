import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { APP_VERSION } from '../src/version.js'

const readJson = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(process.cwd(), name), 'utf-8')) as T

describe('version metadata', () => {
  // `npm run version-packages` (changesets + scripts/sync-version.js) writes
  // all four copies at once; this guards a hand-edit that touches only some.
  it('keeps package, MCP manifest, lockfile, and runtime version in sync', () => {
    const packageJson = readJson<{ version: string }>('package.json')
    const serverJson = readJson<{
      version: string
      packages: Array<{ version: string }>
    }>('server.json')
    const lockfile = readJson<{
      version: string
      packages: Record<string, { version?: string }>
    }>('package-lock.json')

    expect(APP_VERSION).toBe(packageJson.version)
    expect(serverJson.version).toBe(packageJson.version)
    expect(serverJson.packages[0]?.version).toBe(packageJson.version)
    expect(lockfile.version).toBe(packageJson.version)
    expect(lockfile.packages['']?.version).toBe(packageJson.version)
  })
})
