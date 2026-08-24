import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const readJson = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(process.cwd(), name), 'utf-8')) as T

// The MCP registry only validates server.json at publish time — which happens
// after npm has already gone out, so a rejected manifest leaves the registry
// stranded on an older version. These are the constraints that bit us (v0.7.5
// was rejected for a 105-character description); check them in CI instead.
describe('server.json (MCP registry manifest)', () => {
  const server = readJson<{
    name: string
    description: string
    packages: Array<{ identifier: string; registryType: string }>
  }>('server.json')
  const packageJson = readJson<{ name: string; mcpName: string }>('package.json')

  it('keeps the description within the registry limit of 100 characters', () => {
    expect(server.description.length).toBeLessThanOrEqual(100)
  })

  it('claims the same server name as the published npm package', () => {
    expect(server.name).toBe(packageJson.mcpName)
  })

  it('points at this npm package', () => {
    expect(server.packages[0]?.registryType).toBe('npm')
    expect(server.packages[0]?.identifier).toBe(packageJson.name)
  })
})
