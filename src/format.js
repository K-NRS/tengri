import { transliterate } from './transliterate.js'

const wrap = (code, enabled) => (text) => (enabled ? `\x1b[${code}m${text}\x1b[0m` : text)

/**
 * One quote as terminal text: script (inscriptions only), transcription,
 * modern Turkish, English, attribution.
 */
export const formatQuote = (quote, { color = false } = {}) => {
  const bold = wrap('1', color)
  const dim = wrap('2', color)
  const lines = []
  if (quote.script) lines.push(bold(transliterate(quote.text)))
  lines.push(quote.script ? dim(quote.text) : bold(quote.text))
  lines.push('', quote.tr, quote.en, '', dim(`— ${quote.source}, ${quote.ref}`))
  return lines.map((line) => (line ? `  ${line}` : line)).join('\n')
}
