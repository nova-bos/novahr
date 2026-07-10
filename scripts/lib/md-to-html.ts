import { marked } from 'marked'
import * as fs from 'fs/promises'
import { buildHtmlPage } from './pdf-template'

// Internal annotation patterns to strip from markdown before rendering
const INTERNAL_ANNOTATION_PATTERNS = [
  /DRAFT NOTICE/i,
  /Internal note/i,
  /Attorney/i,
  /publish-instruction/i,
  /For internal/i,
  /\*\*Version:\*\*/,
  /\*\*Owner:\*\*/,
]

function stripInternalBlockquotes(markdown: string): string {
  const lines = markdown.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Check if this is the start of a blockquote block
    if (line.startsWith('> ')) {
      // Collect the full blockquote block
      const blockLines: string[] = []
      let j = i
      while (j < lines.length && (lines[j].startsWith('> ') || lines[j] === '>')) {
        blockLines.push(lines[j])
        j++
      }
      const blockText = blockLines.join('\n')

      // Check if this blockquote is an internal annotation
      const isInternal = INTERNAL_ANNOTATION_PATTERNS.some((pattern) =>
        pattern.test(blockText)
      )

      if (!isInternal) {
        // Keep the blockquote
        result.push(...blockLines)
      }
      // Skip past the block
      i = j
    } else {
      result.push(line)
      i++
    }
  }

  return result.join('\n')
}

export async function mdFileToHtml(
  filePath: string,
  opts: {
    title: string
    subtitle?: string
    effectiveDate?: string
    version?: string
    coverPage?: boolean
  }
): Promise<string> {
  const raw = await fs.readFile(filePath, 'utf8')
  const cleaned = stripInternalBlockquotes(raw)

  // Configure marked with GFM
  marked.setOptions({
    gfm: true,
  })

  const body = await marked.parse(cleaned)

  return buildHtmlPage({
    ...opts,
    body,
  })
}
