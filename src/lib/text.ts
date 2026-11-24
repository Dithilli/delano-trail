/** Plain text of a sanitised HTML fragment. */
export function plain(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
    .replace(/ |​/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cut at a sentence end at or before `max` characters, falling back to a word break. */
export function excerpt(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '))
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…'
}
