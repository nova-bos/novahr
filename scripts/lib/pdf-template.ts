import * as fs from 'fs'
import * as path from 'path'

export interface BuildHtmlPageOpts {
  title: string
  subtitle?: string
  effectiveDate?: string
  version?: string
  body: string
  coverPage?: boolean
  screenshots?: Record<string, string> // key: caption/keyword, value: absolute path to PNG
}

export function buildHtmlPage(opts: BuildHtmlPageOpts): string {
  const { title, subtitle, effectiveDate, version, body, coverPage = false } = opts

  const metaLine = (() => {
    const parts: string[] = []
    if (version) parts.push(`Version ${version}`)
    if (effectiveDate) parts.push(`Effective ${effectiveDate}`)
    return parts.join(' | ')
  })()

  const coverHtml = coverPage
    ? `
  <div class="cover">
    <div class="cover-inner">
      <div class="cover-wordmark">NovaHR</div>
      <div class="cover-tagline">HR and Payroll, Built for South African Business</div>
      <hr class="cover-rule" />
      <div class="cover-title">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="cover-subtitle">${escapeHtml(subtitle)}</div>` : ''}
      ${metaLine ? `<div class="cover-meta">${escapeHtml(metaLine)}</div>` : ''}
      <div class="cover-contact">hello@novahr.co.za | novahr-five.vercel.app</div>
    </div>
  </div>
  <div class="page-break"></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    /* Reset and base */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: A4;
      margin: 20mm 22mm 24mm 22mm;
    }

    body {
      font-family: 'Inter', -apple-system, system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.7;
      color: #0F172A;
      background: #ffffff;
    }

    /* Print header (shown on non-cover pages) */
    .print-header {
      display: none;
    }

    @media print {
      .print-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        position: running(header);
        padding-bottom: 6px;
        border-bottom: 1px solid #E2E8F0;
        margin-bottom: 8px;
      }

      .print-header-wordmark {
        font-size: 11px;
        font-weight: 700;
        color: #4F46E5;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .print-header-doc {
        font-size: 11px;
        color: #64748B;
      }

      @page {
        @top-center {
          content: element(header);
        }
      }
    }

    /* Footer */
    @media print {
      @page {
        @bottom-left {
          content: "NovaHR | novahr-five.vercel.app";
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
          font-size: 11px;
          color: #94A3B8;
          border-top: 1px solid #E2E8F0;
          padding-top: 4px;
        }
        @bottom-right {
          content: counter(page);
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
          font-size: 11px;
          color: #94A3B8;
          border-top: 1px solid #E2E8F0;
          padding-top: 4px;
        }
      }
    }

    /* Cover page */
    .cover {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 240mm;
      text-align: center;
    }

    .cover-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .cover-wordmark {
      font-size: 28px;
      font-weight: 700;
      color: #4F46E5;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .cover-tagline {
      font-size: 14px;
      color: #64748B;
      font-weight: 400;
    }

    .cover-rule {
      width: 40%;
      border: none;
      border-top: 2px solid #4F46E5;
    }

    .cover-title {
      font-size: 24px;
      color: #0F172A;
      font-weight: 600;
      line-height: 1.3;
      max-width: 480px;
    }

    .cover-subtitle {
      font-size: 16px;
      color: #64748B;
      font-weight: 400;
    }

    .cover-meta {
      font-size: 12px;
      color: #64748B;
    }

    .cover-contact {
      font-size: 11px;
      color: #64748B;
      margin-top: 24px;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    /* Typography */
    h1 {
      font-size: 22px;
      color: #4F46E5;
      font-weight: 700;
      border-bottom: 2px solid #4F46E5;
      padding-bottom: 6px;
      margin-top: 32px;
      margin-bottom: 16px;
      page-break-after: avoid;
      break-after: avoid;
    }

    h2 {
      font-size: 18px;
      color: #0F172A;
      font-weight: 600;
      margin-top: 28px;
      margin-bottom: 12px;
      page-break-after: avoid;
      break-after: avoid;
    }

    h3 {
      font-size: 15px;
      color: #0F172A;
      font-weight: 600;
      margin-top: 20px;
      margin-bottom: 8px;
      page-break-after: avoid;
      break-after: avoid;
    }

    p {
      font-size: 14px;
      line-height: 1.7;
      color: #0F172A;
      margin: 0 0 12px;
    }

    li {
      font-size: 14px;
      line-height: 1.7;
      margin-bottom: 4px;
    }

    ul {
      margin: 0 0 12px;
      padding-left: 20px;
      list-style: disc;
    }

    ol {
      margin: 0 0 12px;
      padding-left: 20px;
    }

    /* Tables */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 0 0 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th {
      background: #4F46E5;
      color: #ffffff;
      font-weight: 600;
      font-size: 12px;
      padding: 8px 12px;
      text-align: left;
    }

    td {
      border: 1px solid #E2E8F0;
      padding: 8px 12px;
      font-size: 13px;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #F8FAFC;
    }

    /* Blockquotes */
    blockquote {
      border-left: 4px solid #4F46E5;
      background: #EEF2FF;
      padding: 16px 20px;
      border-radius: 0 6px 6px 0;
      font-style: italic;
      margin: 20px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    blockquote p {
      margin: 0;
    }

    /* Code */
    code {
      background: #F1F5F9;
      border-radius: 3px;
      padding: 2px 5px;
      font-family: monospace;
      font-size: 12px;
    }

    pre {
      background: #F1F5F9;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 0 0 12px;
      overflow: auto;
    }

    pre code {
      background: none;
      padding: 0;
    }

    /* Horizontal rules */
    hr {
      border: none;
      border-top: 1px solid #E2E8F0;
      margin: 24px 0;
    }

    /* Signature blocks */
    .sig-block {
      display: inline-block;
      width: 60mm;
      border-bottom: 1px solid #CBD5E1;
      margin-bottom: 4px;
      min-height: 24px;
    }

    .sig-label {
      font-size: 11px;
      color: #64748B;
      display: block;
    }

    .sig-wrapper {
      margin: 16px 0;
    }

    /* Strong and emphasis */
    strong { font-weight: 600; }
    em { font-style: italic; }

    /* Links */
    a { color: #4F46E5; text-decoration: none; }

    /* Checkboxes (task list items) */
    input[type="checkbox"] {
      margin-right: 6px;
    }

    /* Guide screenshots */
    .guide-screenshot {
      margin: 20px 0;
      page-break-inside: avoid;
      break-inside: avoid;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      overflow: hidden;
    }

    .guide-screenshot img {
      width: 100%;
      display: block;
    }

    .guide-screenshot figcaption {
      padding: 8px 12px;
      font-size: 11px;
      color: #64748B;
      font-style: italic;
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
    }
  </style>
</head>
<body>
  <div class="print-header" aria-hidden="true">
    <span class="print-header-wordmark">NovaHR</span>
    <span class="print-header-doc">${escapeHtml(title)}</span>
  </div>
  ${coverHtml}
  <div class="content">
    ${body}
  </div>
</body>
</html>`
}

/**
 * Build a base64-embedded <figure> block for a screenshot.
 * Returns an empty string if the file does not exist (graceful skip).
 */
export function buildScreenshotFigure(imagePath: string, caption: string): string {
  if (!imagePath || !fs.existsSync(imagePath)) {
    return ''
  }
  const ext = path.extname(imagePath).toLowerCase()
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'
  const data = fs.readFileSync(imagePath)
  const b64 = data.toString('base64')
  return `<figure class="guide-screenshot">
  <img src="data:${mime};base64,${b64}" alt="${escapeHtml(caption)}" />
  <figcaption>${escapeHtml(caption)}</figcaption>
</figure>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
