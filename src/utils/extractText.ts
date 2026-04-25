import * as mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

function normalizeText(text: string): string {
  return text.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim()

    if (text) {
      pages.push(text)
    }
  }

  return normalizeText(pages.join('\n\n'))
}

async function extractTextFromDocx(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  return normalizeText(result.value)
}

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (extension === 'txt' || file.type === 'text/plain') {
    return normalizeText(await file.text())
  }

  if (extension === 'pdf' || file.type === 'application/pdf') {
    return extractTextFromPdf(file)
  }

  if (
    extension === 'docx' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractTextFromDocx(file)
  }

  throw new Error('Unsupported file type. Use PDF, TXT, or DOCX.')
}
