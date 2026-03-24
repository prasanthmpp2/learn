import type { ChatMessage, ChatSession } from '../types/app.ts'

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function exportChatToPdf(
  chat: ChatSession | null,
  messages: ChatMessage[],
) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({
    format: 'a4',
    unit: 'pt',
  })

  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 44
  const contentWidth = pageWidth - margin * 2
  let cursorY = 58

  const ensureSpace = (height: number) => {
    if (cursorY + height <= pageHeight - margin) {
      return
    }

    doc.addPage()
    cursorY = margin
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(chat?.title ?? 'AI Study Assistant', margin, cursorY)
  cursorY += 24

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Exported ${new Date().toLocaleString()}`, margin, cursorY)
  cursorY += 28

  messages.forEach((message) => {
    const label = message.role === 'assistant' ? 'AI Study Assistant' : 'You'
    const textLines = doc.splitTextToSize(message.content, contentWidth)
    const lineHeight = 14
    const blockHeight = 24 + textLines.length * lineHeight

    ensureSpace(blockHeight)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(label, margin, cursorY)
    cursorY += 16

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(textLines, margin, cursorY, { maxWidth: contentWidth })
    cursorY += textLines.length * lineHeight + 16
  })

  const filename = slugify(chat?.title ?? 'study-chat') || 'study-chat'
  doc.save(`${filename}.pdf`)
}
