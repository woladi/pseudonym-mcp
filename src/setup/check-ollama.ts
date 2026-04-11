export interface OllamaCheckResult {
  running: boolean
  modelAvailable: boolean
  error?: string
}

/**
 * Check whether Ollama is running and whether the required model is available.
 */
export async function checkOllama(
  baseUrl: string,
  model: string,
  timeoutMs = 3_000,
): Promise<OllamaCheckResult> {
  // Step 1: Check reachability
  let tagsRes: Response
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    tagsRes = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal })
    clearTimeout(t)
  } catch (err) {
    return {
      running: false,
      modelAvailable: false,
      error: `Ollama is not reachable at ${baseUrl}: ${String(err)}`,
    }
  }

  if (!tagsRes.ok) {
    return {
      running: false,
      modelAvailable: false,
      error: `Ollama returned HTTP ${tagsRes.status} at ${baseUrl}`,
    }
  }

  // Step 2: Check model availability
  try {
    const data = (await tagsRes.json()) as { models?: Array<{ name: string }> }
    const models = data.models ?? []
    const modelAvailable = models.some((m) => m.name === model || m.name.startsWith(`${model}:`))
    return { running: true, modelAvailable }
  } catch {
    return { running: true, modelAvailable: false }
  }
}

/**
 * Print a user-friendly warning to stderr if Ollama is unavailable or
 * the required model is missing. Never throws — errors are non-fatal.
 */
export async function printOllamaStatus(baseUrl: string, model: string): Promise<void> {
  const result = await checkOllama(baseUrl, model)

  if (!result.running) {
    process.stderr.write(
      `\n[pseudonym-mcp] WARNING: Ollama not detected at ${baseUrl}\n` +
        `  Install Ollama: https://ollama.com/download\n` +
        `  Then start it: ollama serve\n` +
        `  The LLM NER phase will be skipped until Ollama is available.\n` +
        `  Use --engines regex to suppress this warning.\n\n`,
    )
    return
  }

  if (!result.modelAvailable) {
    process.stderr.write(
      `\n[pseudonym-mcp] WARNING: Model "${model}" not found in Ollama.\n` +
        `  Pull it with: ollama pull ${model}\n` +
        `  The LLM NER phase will fail gracefully until the model is available.\n\n`,
    )
  }
}
