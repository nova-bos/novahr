import { chromium } from 'playwright'
import { mdFileToHtml } from './lib/md-to-html'
import * as fs from 'fs/promises'
import * as path from 'path'

const OUTPUT_BASE = path.join(process.cwd(), 'docs/generated-pdfs')

type PdfOpts = {
  title: string
  subtitle?: string
  effectiveDate?: string
  version?: string
  coverPage?: boolean
}

async function generatePdf(inputMd: string, outputPdf: string, opts: PdfOpts) {
  const html = await mdFileToHtml(inputMd, opts)
  const tmpHtml = outputPdf.replace('.pdf', '.tmp.html')
  await fs.mkdir(path.dirname(outputPdf), { recursive: true })
  await fs.writeFile(tmpHtml, html, 'utf8')

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`file://${tmpHtml}`)
  await page.waitForLoadState('networkidle')
  await page.pdf({
    path: outputPdf,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '22mm', bottom: '24mm', left: '22mm' },
  })
  await browser.close()
  await fs.unlink(tmpHtml)
  console.log(`Generated: ${path.relative(process.cwd(), outputPdf)}`)
}

const DOCS = path.join(process.cwd(), 'docs')

const documents: Array<{ input: string; output: string; opts: PdfOpts }> = [
  {
    input: path.join(DOCS, 'legal/master-subscription-agreement.md'),
    output: path.join(OUTPUT_BASE, 'legal/master-subscription-agreement.pdf'),
    opts: {
      title: 'Master Subscription Agreement',
      subtitle: 'Enterprise Customer Agreement',
      effectiveDate: '10 July 2026',
      version: 'v1.0',
      coverPage: true,
    },
  },
  {
    input: path.join(DOCS, 'legal/nda-mutual.md'),
    output: path.join(OUTPUT_BASE, 'legal/nda-mutual.pdf'),
    opts: {
      title: 'Mutual Non-Disclosure Agreement',
      effectiveDate: '10 July 2026',
      version: 'v1.0',
      coverPage: true,
    },
  },
  {
    input: path.join(DOCS, 'legal/nda-one-way.md'),
    output: path.join(OUTPUT_BASE, 'legal/nda-one-way.pdf'),
    opts: {
      title: 'Non-Disclosure Agreement',
      subtitle: 'One-Way (Prospect / Partner)',
      effectiveDate: '10 July 2026',
      version: 'v1.0',
      coverPage: true,
    },
  },
  {
    input: path.join(DOCS, 'compliance/dsar-access-form.md'),
    output: path.join(OUTPUT_BASE, 'compliance/dsar-access-form.pdf'),
    opts: {
      title: 'Data Subject Access Request Form',
      subtitle: 'Request to Access Personal Information',
      coverPage: false,
    },
  },
  {
    input: path.join(DOCS, 'compliance/dsar-correction-form.md'),
    output: path.join(OUTPUT_BASE, 'compliance/dsar-correction-form.pdf'),
    opts: {
      title: 'Data Subject Correction Request Form',
      coverPage: false,
    },
  },
  {
    input: path.join(DOCS, 'compliance/dsar-deletion-form.md'),
    output: path.join(OUTPUT_BASE, 'compliance/dsar-deletion-form.pdf'),
    opts: {
      title: 'Data Subject Deletion Request Form',
      subtitle: 'Right to Erasure / Right to be Forgotten',
      coverPage: false,
    },
  },
  {
    input: path.join(DOCS, 'compliance/paia-manual.md'),
    output: path.join(OUTPUT_BASE, 'compliance/paia-manual.pdf'),
    opts: {
      title: 'PAIA Manual',
      subtitle: 'Promotion of Access to Information Act 2 of 2000',
      effectiveDate: '10 July 2026',
      version: 'v1.0',
      coverPage: true,
    },
  },
  {
    input: path.join(DOCS, 'compliance/information-officer-appointment.md'),
    output: path.join(OUTPUT_BASE, 'compliance/information-officer-appointment.pdf'),
    opts: {
      title: 'Information Officer Appointment',
      subtitle: 'Board Resolution and POPIA Registration Record',
      coverPage: false,
    },
  },
  {
    input: path.join(DOCS, 'payroll-compliance/compliance-disclaimer-and-customer-responsibilities.md'),
    output: path.join(OUTPUT_BASE, 'payroll/payroll-compliance-disclaimer.pdf'),
    opts: {
      title: 'Payroll Compliance Disclaimer',
      subtitle: 'Customer Acknowledgement and Responsibility Statement',
      effectiveDate: '10 July 2026',
      version: 'v1.0',
      coverPage: true,
    },
  },
  {
    input: path.join(DOCS, 'sales/proposal-template.md'),
    output: path.join(OUTPUT_BASE, 'sales/proposal-template.pdf'),
    opts: {
      title: 'Proposal',
      subtitle: 'NovaHR HR and Payroll Platform',
      coverPage: true,
    },
  },
  {
    input: path.join(DOCS, 'sales/quotation-template.md'),
    output: path.join(OUTPUT_BASE, 'sales/quotation-template.pdf'),
    opts: {
      title: 'Quotation',
      coverPage: false,
    },
  },
  {
    input: path.join(DOCS, 'customer-success/welcome-pack.md'),
    output: path.join(OUTPUT_BASE, 'customer-success/welcome-pack.pdf'),
    opts: {
      title: 'Welcome to NovaHR',
      subtitle: 'Your Getting-Started Pack',
      coverPage: true,
    },
  },
]

async function main() {
  console.log(`Generating ${documents.length} PDFs...`)
  for (const doc of documents) {
    await generatePdf(doc.input, doc.output, doc.opts)
  }
  console.log('All PDFs generated.')
}

main().catch((err) => {
  console.error('PDF generation failed:', err)
  process.exit(1)
})
