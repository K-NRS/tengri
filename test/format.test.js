import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatQuote, CREDIT } from '../src/format.js'
import { transliterate, SEPARATOR } from '../src/index.js'

const inscription = {
  source: 'Fixture stele',
  ref: 'X 1',
  script: true,
  text: 'täŋri',
  tr: 'türkçe satır',
  en: 'english line',
}

test('inscription quote: script, transcription, tr, en, attribution, credit in order', () => {
  const lines = formatQuote(inscription).split('\n').map((l) => l.trim())
  assert.deepEqual(lines, [
    transliterate('täŋri'),
    'täŋri',
    '',
    'türkçe satır',
    'english line',
    '',
    '— Fixture stele, X 1',
    'Kerem Noras (noras.tech)',
  ])
  assert.equal(CREDIT, 'Kerem Noras (noras.tech)')
})

test('non-inscription quote has no script line', () => {
  const out = formatQuote({ ...inscription, script: false })
  assert.equal(out.includes(transliterate('täŋri')), false)
  assert.ok(out.includes('täŋri'))
})

test('long lines wrap at the given width, script wraps between words', () => {
  const quote = {
    ...inscription,
    text: 'tengri teg tengride bolmış türk bilge kagan',
    tr: 'bir iki üç dört beş altı yedi sekiz dokuz on',
  }
  const lines = formatQuote(quote, { width: 20 }).split('\n').map((l) => l.trim())
  for (const line of lines) assert.ok([...line].length <= 24, line)
  const scriptLines = lines.filter((l) => l.includes(SEPARATOR) || /^[\u{10C00}-\u{10C4F}]+$/u.test(l))
  assert.ok(scriptLines.length > 1)
})

test('no ANSI escapes unless color is on', () => {
  assert.equal(formatQuote(inscription).includes('\x1b'), false)
  assert.equal(formatQuote(inscription, { color: true }).includes('\x1b['), true)
})
