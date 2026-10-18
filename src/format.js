import { transliterate, SEPARATOR } from './transliterate.js'

export const CREDIT = 'made by Kerem Noras (noras.tech)'
export const MIN_WIDTH = 32

const GOLD = '1;38;5;179'
const FAINT = '2'
const ITALIC_FAINT = '2;3'
const BORDER = '38;5;137'
const WHISPER = '2;38;5;242'

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
  const paint = (code) => (text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text)
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
