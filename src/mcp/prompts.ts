import { ConfigManager } from '../config/manager.js'

export interface PseudonymizeTaskArgs {
  text: string
  task: string
  lang?: string
}

export interface PrivacyScanFileArgs {
  filePath: string
  task?: string
  lang?: string
}

export function pseudonymizeTaskMessage(args: PseudonymizeTaskArgs): string {
  const lang = args.lang ?? ConfigManager.getInstance().get().lang
  return (
    `Privacy note: this MCP prompt template includes the raw text below in the prompt message. ` +
    `For strongest privacy, call the mask_text tool directly before giving content to a cloud LLM.\n\n` +
    `Use pseudonym-mcp mask_text on the following text (lang: ${lang}) and save the session_id:\n\n` +
    `<text>\n${args.text}\n</text>\n\n` +
    `Then: ${args.task}\n\n` +
    `Finally, call pseudonym-mcp unmask_text with the saved session_id to restore original values before showing the response.`
  )
}

export function privacyScanFileMessage(args: PrivacyScanFileArgs): string {
  const lang = args.lang ?? ConfigManager.getInstance().get().lang
  const task = args.task ?? 'summarize the key points'
  return (
    `Privacy note: this MCP prompt template asks another tool to extract raw text, then includes workflow instructions in the prompt. ` +
    `For strongest privacy, extract and mask content explicitly before giving it to a cloud LLM.\n\n` +
    `Use macos-vision-mcp to extract text from ${args.filePath}.\n` +
    `Then use pseudonym-mcp mask_text on the result (lang: ${lang}), save session_id.\n` +
    `Then: ${task}.\n` +
    `Finally call pseudonym-mcp unmask_text with the session_id to restore original values in the response.`
  )
}
