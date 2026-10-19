import { transliterate, SEPARATOR } from './transliterate.js'
import { GOLD, FAINT, ITALIC_FAINT, BORDER, WHISPER, paint as paintCode } from './style.js'

export const CREDIT = 'noras.tech'
export const MIN_WIDTH = 32


const PAD = 2
const TITLE = transliterate('tengri')

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
 * One quote in a rounded frame: script and transcription, Turkish and English
 * renderings, attribution; the credit sits in the bottom border. `width` is
 * the text width inside the frame.
 */
export const formatQuote = (quote, { color = false, width = 68 } = {}) => {
  const textWidth = Math.max(width, MIN_WIDTH)
  const paint = (code) => paintCode(code, color)
  const wrap = (text, code, sep) => wrapWords(text, textWidth, sep).map((line) => ({ line, code }))

  const original = [...wrap(transliterate(quote.text), GOLD, SEPARATOR), ...wrap(quote.text, FAINT)]
  const renderings = [...wrap(quote.tr, ''), ...wrap(quote.en, ITALIC_FAINT)]
  const attribution = wrap(`— ${quote.source}, ${quote.ref}`, FAINT)

  const border = paint(BORDER)
  const inner = textWidth + PAD * 2
  const row = ({ line, code } = { line: '', code: '' }) => {
    const text = code ? paint(code)(line) : line
    return `${border('│')}${' '.repeat(PAD)}${text}${' '.repeat(textWidth - [...line].length)}${' '.repeat(PAD)}${border('│')}`
  }

  const top = border(`╭─ ${TITLE} ${'─'.repeat(inner - [...TITLE].length - 4)}─╮`)
  const divider = { line: ' '.repeat(Math.floor((textWidth - 1) / 2)) + SEPARATOR, code: BORDER }
  const label = ` ${CREDIT} `
  const bottomFill = '─'.repeat(inner - label.length - 1)
  const bottom = border(`╰${bottomFill}`) + paint(WHISPER)(label) + border('─╯')

  return [
    top,
    row(),
    ...original.map(row),
    row(divider),
    ...renderings.map(row),
    row(),
    ...attribution.map(row),
    row(),
    bottom,
  ].join('\n')
}
