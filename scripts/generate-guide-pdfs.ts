/**
 * Generate 7 guide PDFs with embedded annotated screenshots.
 *
 * Usage:
 *   npm run pdf:guides
 *   npx tsx scripts/generate-guide-pdfs.ts
 *
 * Screenshots are injected after specific headings in the rendered HTML.
 * If a screenshot file does not exist, the injection is skipped silently.
 */

import { chromium } from 'playwright'
import { marked } from 'marked'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import { buildHtmlPage, buildScreenshotFigure } from './lib/pdf-template'

const DOCS = path.join(process.cwd(), 'docs')
const SHOTS_DIR = path.join(process.cwd(), 'docs/screenshots/guides')
const OUTPUT_BASE = path.join(process.cwd(), 'docs/generated-pdfs')

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

type ScreenshotInjection = {
  /** Lowercase keywords to match against heading text. Match is OR (any keyword hits). */
  keywords: string[]
  /** Filename inside docs/screenshots/guides/ */
  filename: string
  /** Caption for the figure */
  caption: string
  /** If true, inject before any heading (at the very top of the body HTML) */
  atTop?: boolean
  /** If true, inject after the FIRST h1 or h2 encountered */
  afterFirstHeading?: boolean
}

type GuideDefinition = {
  input: string
  output: string
  title: string
  subtitle?: string
  coverPage: boolean
  injections: ScreenshotInjection[]
}

// -------------------------------------------------------------------------
// Guide definitions
// -------------------------------------------------------------------------

const guides: GuideDefinition[] = [
  {
    input: path.join(DOCS, 'customer/quick-start-guide.md'),
    output: path.join(OUTPUT_BASE, 'customer/quick-start-guide.pdf'),
    title: 'Quick Start Guide',
    subtitle: 'Get up and running in 15 minutes',
    coverPage: true,
    injections: [
      {
        keywords: ['dashboard', 'overview', 'get started', 'before you start', 'step 1'],
        filename: 'qs-dashboard.png',
        caption: 'Your NovaHR dashboard',
      },
      {
        keywords: ['employee', 'add', 'step 3', 'create', 'step 2'],
        filename: 'qs-add-employee.png',
        caption: 'Adding a new employee: fill in the highlighted fields',
      },
      {
        keywords: ['leave', 'step 4', 'step 5'],
        filename: 'qs-leave-requests.png',
        caption: 'Leave management: submit and approve requests',
      },
      {
        keywords: ['payroll', 'pay run', 'run a test', 'step 6', 'go live'],
        filename: 'qs-payroll-run.png',
        caption: 'Starting a payroll run',
      },
    ],
  },
  {
    input: path.join(DOCS, 'customer/onboarding-guide.md'),
    output: path.join(OUTPUT_BASE, 'customer/onboarding-guide.pdf'),
    title: 'Onboarding Guide',
    subtitle: 'Setting up NovaHR for your company',
    coverPage: true,
    injections: [
      {
        keywords: [],
        filename: 'ob-dashboard.png',
        caption: 'NovaHR dashboard overview',
        afterFirstHeading: true,
      },
      {
        keywords: ['setting', 'company', 'profile', 'foundation', 'phase 1'],
        filename: 'ob-settings.png',
        caption: 'Company settings: complete your profile',
      },
      {
        keywords: ['employee', 'team', 'staff', 'data', 'phase 2'],
        filename: 'ob-employees.png',
        caption: 'Employee list: add your team',
      },
    ],
  },
  {
    input: path.join(DOCS, 'customer/payroll-setup-guide.md'),
    output: path.join(OUTPUT_BASE, 'customer/payroll-setup-guide.pdf'),
    title: 'Payroll Setup Guide',
    subtitle: 'Configuring payroll for South African compliance',
    coverPage: true,
    injections: [
      {
        keywords: ['setting', 'config', 'setup', 'pay cycle', 'company-level', 'company level'],
        filename: 'ps-payroll-settings.png',
        caption: 'Payroll settings: configure your pay cycle',
      },
      {
        keywords: ['employee', 'salary', 'profile', 'per-employee', 'per employee'],
        filename: 'ps-employee-payroll.png',
        caption: 'Employee payroll profile: set salary and tax details',
      },
      {
        keywords: ['run', 'process', 'start', 'verification', 'ongoing', 'rhythm'],
        filename: 'ps-run-payroll.png',
        caption: 'Running your first payroll',
      },
    ],
  },
  {
    input: path.join(DOCS, 'customer/how-to-guides.md'),
    output: path.join(OUTPUT_BASE, 'customer/how-to-guides.pdf'),
    title: 'How-To Guides',
    subtitle: 'Step-by-step task reference',
    coverPage: true,
    injections: [
      {
        keywords: ['add an employee', 'add employee', 'new employee', '1. add'],
        filename: 'ht-add-employee.png',
        caption: 'Add employee: complete all required fields',
      },
      {
        keywords: ['approve', 'leave request', '3. approve', 'approve leave'],
        filename: 'ht-approve-leave.png',
        caption: 'Approving a leave request',
      },
      {
        keywords: ['payroll run', 'run payroll', 'process payroll', '2. process'],
        filename: 'ht-run-payroll.png',
        caption: 'Starting a payroll run',
      },
      {
        keywords: ['payslip', 'export', 'download', 'generate payslip', '4. generate'],
        filename: 'ht-export-payslip.png',
        caption: 'Downloading a payslip PDF',
      },
      {
        keywords: ['invite', 'user', 'team member', '9. invite', 'add a user'],
        filename: 'ht-invite-user.png',
        caption: 'Inviting a team member',
      },
      {
        keywords: ['report', 'insight', 'analytic', '5. export report', 'export report'],
        filename: 'ht-reports.png',
        caption: 'Running a payroll report',
      },
    ],
  },
  {
    input: path.join(DOCS, 'customer/faq.md'),
    output: path.join(OUTPUT_BASE, 'customer/faq.pdf'),
    title: 'Frequently Asked Questions',
    coverPage: false,
    injections: [
      {
        keywords: [],
        filename: 'faq-dashboard.png',
        caption: 'NovaHR dashboard overview',
        atTop: true,
      },
      {
        keywords: ['leave', 'leave management', 'annual leave'],
        filename: 'faq-leave.png',
        caption: 'Leave management',
      },
    ],
  },
  {
    input: path.join(DOCS, 'customer/sars-compliance-calendar.md'),
    output: path.join(OUTPUT_BASE, 'customer/sars-compliance-calendar.pdf'),
    title: 'SARS Compliance Calendar 2026/27',
    subtitle: 'Key payroll submission dates for South African employers',
    coverPage: true,
    injections: [
      {
        keywords: [],
        filename: 'sars-payroll.png',
        caption: 'NovaHR payroll dashboard',
        atTop: true,
      },
    ],
  },
  {
    input: path.join(DOCS, 'sales/sales-deck-outline.md'),
    output: path.join(OUTPUT_BASE, 'sales/sales-deck-outline.pdf'),
    title: 'NovaHR: HR and Payroll for South African Business',
    subtitle: 'Platform Overview',
    coverPage: true,
    injections: [
      {
        keywords: ['dashboard', 'overview', 'one picture', 'slide 4', 'title'],
        filename: 'sd-dashboard.png',
        caption: 'NovaHR dashboard',
      },
      {
        keywords: ['payroll', 'slide 5', 'pay'],
        filename: 'sd-payroll.png',
        caption: 'Payroll management',
      },
      {
        keywords: ['employee', 'team', 'slide 6', 'self-service', 'self service'],
        filename: 'sd-employees.png',
        caption: 'Employee management',
      },
      {
        keywords: ['report', 'insight', 'analytic', 'slide 7', 'slide 8', 'compliance'],
        filename: 'sd-reports.png',
        caption: 'Reporting and insights',
      },
    ],
  },
]

// -------------------------------------------------------------------------
// Internal annotation stripping (same as md-to-html.ts)
// -------------------------------------------------------------------------

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
    if (line.startsWith('> ')) {
      const blockLines: string[] = []
      let j = i
      while (j < lines.length && (lines[j].startsWith('> ') || lines[j] === '>')) {
        blockLines.push(lines[j])
        j++
      }
      const blockText = blockLines.join('\n')
      const isInternal = INTERNAL_ANNOTATION_PATTERNS.some((p) => p.test(blockText))
      if (!isInternal) result.push(...blockLines)
      i = j
    } else {
      result.push(line)
      i++
    }
  }
  return result.join('\n')
}

// -------------------------------------------------------------------------
// Screenshot injection into rendered HTML
// -------------------------------------------------------------------------

/**
 * Inject screenshot figures into an HTML body string at the right positions.
 *
 * Strategy:
 * - atTop: prepend figure before any content
 * - afterFirstHeading: insert after the first <h1> or <h2> closing tag
 * - keywords: scan each <h1>/<h2>/<h3> text; if text matches any keyword,
 *   insert figure immediately after that heading's closing tag.
 *   Each injection is used at most once (first match wins).
 */
function injectScreenshots(
  bodyHtml: string,
  injections: ScreenshotInjection[]
): string {
  // Build figure HTML for each injection; skip if file missing
  const figures = injections.map((inj) => {
    const shotPath = path.join(SHOTS_DIR, inj.filename)
    return {
      ...inj,
      figure: buildScreenshotFigure(shotPath, inj.caption),
    }
  })

  let result = bodyHtml

  // 1. Handle atTop injections first (prepend before everything)
  const atTopFigures = figures
    .filter((f) => f.atTop && f.figure)
    .map((f) => f.figure)
    .join('\n')

  if (atTopFigures) {
    result = atTopFigures + '\n' + result
  }

  // 2. Handle afterFirstHeading injections
  const firstHeadingFigures = figures.filter((f) => f.afterFirstHeading && f.figure)
  if (firstHeadingFigures.length > 0) {
    // Find the first </h1>, </h2>, or </h3>
    const firstHeadingMatch = result.match(/<\/h[1-3]>/i)
    if (firstHeadingMatch && firstHeadingMatch.index !== undefined) {
      const insertAt = firstHeadingMatch.index + firstHeadingMatch[0].length
      const figBlock = firstHeadingFigures.map((f) => f.figure).join('\n')
      result = result.slice(0, insertAt) + '\n' + figBlock + result.slice(insertAt)
    }
  }

  // 3. Handle keyword-based injections
  // We do a single pass: find all heading tags, check if any keyword injection
  // matches, insert figure right after the closing heading tag.
  // Track which injections have already been used.
  const keywordInjections = figures.filter(
    (f) => !f.atTop && !f.afterFirstHeading && f.keywords.length > 0 && f.figure
  )
  const used = new Set<number>()

  // Regex to find heading opening tags (h1, h2, h3)
  const headingRe = /<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi
  let lastIndex = 0
  let output = ''
  let match: RegExpExecArray | null

  headingRe.lastIndex = 0
  while ((match = headingRe.exec(result)) !== null) {
    const headingText = match[2].replace(/<[^>]+>/g, '').toLowerCase().trim()
    output += result.slice(lastIndex, match.index + match[0].length)
    lastIndex = match.index + match[0].length

    // Find first unused injection whose keywords match this heading
    for (let i = 0; i < keywordInjections.length; i++) {
      if (used.has(i)) continue
      const inj = keywordInjections[i]
      const matches = inj.keywords.some((kw) => headingText.includes(kw.toLowerCase()))
      if (matches) {
        output += '\n' + inj.figure
        used.add(i)
        break
      }
    }
  }
  output += result.slice(lastIndex)

  return output
}

// -------------------------------------------------------------------------
// PDF generation
// -------------------------------------------------------------------------

async function generateGuidePdf(guide: GuideDefinition): Promise<void> {
  const rawMd = await fs.readFile(guide.input, 'utf8')
  const cleaned = stripInternalBlockquotes(rawMd)

  marked.setOptions({ gfm: true })
  const bodyHtml = await marked.parse(cleaned)

  // Inject screenshots into body HTML before passing to buildHtmlPage
  const bodyWithScreenshots = injectScreenshots(bodyHtml, guide.injections)

  const html = buildHtmlPage({
    title: guide.title,
    subtitle: guide.subtitle,
    coverPage: guide.coverPage,
    body: bodyWithScreenshots,
  })

  const tmpHtml = guide.output.replace('.pdf', '.tmp.html')
  await fs.mkdir(path.dirname(guide.output), { recursive: true })
  await fs.writeFile(tmpHtml, html, 'utf8')

  const browser = await chromium.launch()
  const page = await browser.newPage()
  // Use file:// URL so base64 data: images render correctly
  await page.goto(`file://${tmpHtml}`, { waitUntil: 'networkidle' })
  await page.pdf({
    path: guide.output,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '22mm', bottom: '24mm', left: '22mm' },
  })
  await browser.close()
  await fs.unlink(tmpHtml)

  const stats = fsSync.statSync(guide.output)
  const sizeKb = Math.round(stats.size / 1024)
  console.log(
    `Generated: ${path.relative(process.cwd(), guide.output)} (${sizeKb} KB)`
  )
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------

async function main() {
  console.log(`Generating ${guides.length} guide PDFs...`)
  for (const guide of guides) {
    await generateGuidePdf(guide)
  }
  console.log('All guide PDFs generated.')
}

main().catch((err) => {
  console.error('Guide PDF generation failed:', err)
  process.exit(1)
})
