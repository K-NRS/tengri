import { transliterate, SEPARATOR } from './transliterate.js'

export const CREDIT = 'Kerem Noras (noras.tech)'

const GOLD = '1;38;5;179'
const FAINT = '2'
const WHISPER = '2;38;5;242'
const ITALIC_FAINT = '2;3'

const paint = (code, enabled) => (text) => (enabled ? `\x1b[${code}m${text}\x1b[0m` : text)

const wrapWords = (text, width, sep = ' ') => {
  const lines = []
  let line = ''
  for (const word of text.split(sep)) {
    const next = line ? line + sep + word : word
    if (line && [...next].length > width) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  return line ? [...lines, line] : lines
}

/**
 * One quote as terminal text, in three blocks: the original (script and
 * transcription for inscriptions), the Turkish and English renderings, and
 * the attribution.
 */
export const formatQuote = (quote, { color = false, width = 72 } = {}) => {
  const style = (code) => paint(code, color)
  const original = quote.script
    ? [
        ...wrapWords(transliterate(quote.text), width, SEPARATOR).map(style(GOLD)),
        ...wrapWords(quote.text, width).map(style(FAINT)),
      ]
    : wrapWords(quote.text, width).map(style(GOLD))
  const renderings = [
    ...wrapWords(quote.tr, width),
    ...wrapWords(quote.en, width).map(style(ITALIC_FAINT)),
  ]
  const attribution = [style(FAINT)(`— ${quote.source}, ${quote.ref}`), style(WHISPER)(CREDIT)]

  return [original, renderings, attribution]
    .map((block) => block.map((line) => `  ${line}`).join('\n'))
    .join('\n\n')
}
