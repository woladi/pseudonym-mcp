import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConfigManager } from '../src/config/manager.js'
import { pseudonymizeTaskMessage, privacyScanFileMessage } from '../src/mcp/prompts.js'

beforeEach(() => {
  ConfigManager.reset()
  // Explicit: these assertions are about the prompt text, not about whatever
  // mcp-config.json happens to sit in the working directory.
  ConfigManager.init({ lang: 'pl' })
})

afterEach(() => {
  ConfigManager.reset()
})

describe('pseudonymizeTaskMessage', () => {
  it('includes the original text verbatim', () => {
    const text = 'Call John at 555-1234'
    const msg = pseudonymizeTaskMessage({ text, task: 'extract names' })
    expect(msg).toContain(text)
  })

  it('includes the task instruction', () => {
    const msg = pseudonymizeTaskMessage({ text: 'some text', task: 'write a summary' })
    expect(msg).toContain('write a summary')
  })

  it('uses config lang when lang arg is omitted', () => {
    const msg = pseudonymizeTaskMessage({ text: 'x', task: 'y' })
    expect(msg).toContain('lang: pl') // config lang set in beforeEach
  })

  it('overrides lang when provided', () => {
    const msg = pseudonymizeTaskMessage({ text: 'x', task: 'y', lang: 'pl' })
    expect(msg).toContain('lang: pl')
  })

  it('instructs to save session_id and unmask at the end', () => {
    const msg = pseudonymizeTaskMessage({ text: 'x', task: 'y' })
    expect(msg).toContain('session_id')
    expect(msg).toContain('unmask_text')
  })

  it('warns that prompt templates are not the strongest privacy boundary', () => {
    const msg = pseudonymizeTaskMessage({ text: 'x', task: 'y' })
    expect(msg).toContain('Privacy note')
    expect(msg).toContain('call the mask_text tool directly')
  })
})

describe('privacyScanFileMessage', () => {
  it('includes the file path', () => {
    const msg = privacyScanFileMessage({ filePath: '/Users/me/doc.pdf' })
    expect(msg).toContain('/Users/me/doc.pdf')
  })

  it('references macos-vision-mcp', () => {
    const msg = privacyScanFileMessage({ filePath: '/tmp/file.pdf' })
    expect(msg).toContain('macos-vision-mcp')
  })

  it('defaults task to summarize the key points', () => {
    const msg = privacyScanFileMessage({ filePath: '/tmp/file.pdf' })
    expect(msg).toContain('summarize the key points')
  })

  it('uses custom task when provided', () => {
    const msg = privacyScanFileMessage({ filePath: '/tmp/file.pdf', task: 'list all dates' })
    expect(msg).toContain('list all dates')
    expect(msg).not.toContain('summarize the key points')
  })

  it('uses config lang when lang arg is omitted', () => {
    const msg = privacyScanFileMessage({ filePath: '/tmp/file.pdf' })
    expect(msg).toContain('lang: pl')
  })

  it('overrides lang when provided', () => {
    const msg = privacyScanFileMessage({ filePath: '/tmp/file.pdf', lang: 'pl' })
    expect(msg).toContain('lang: pl')
  })

  it('instructs to unmask at the end', () => {
    const msg = privacyScanFileMessage({ filePath: '/tmp/file.pdf' })
    expect(msg).toContain('unmask_text')
    expect(msg).toContain('session_id')
  })

  it('warns to extract and mask explicitly for strongest privacy', () => {
    const msg = privacyScanFileMessage({ filePath: '/tmp/file.pdf' })
    expect(msg).toContain('Privacy note')
    expect(msg).toContain('extract and mask content explicitly')
  })
})
