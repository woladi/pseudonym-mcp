import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { APP_VERSION } from '../src/version.js'

describe('version metadata', () => {
  it('keeps package, MCP manifest, and runtime version in sync', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'),
    ) as {
      version: string
    }
    const serverJson = JSON.parse(readFileSync(resolve(process.cwd(), 'server.json'), 'utf-8')) as {
      version: string
      packages: Array<{ version: string }>
    }

    expect(APP_VERSION).toBe(packageJson.version)
    expect(serverJson.version).toBe(packageJson.version)
    expect(serverJson.packages[0]?.version).toBe(packageJson.version)
  })
})
