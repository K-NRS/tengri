import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatQuote, CREDIT } from '../src/format.js'
import { transliterate, SEPARATOR } from '../src/index.js'

const inscription = {
  source: 'Fixture stele',
  ref: 'X 1',
  script: 'original',
  text: 'täŋri',
  tr: 'türkçe satır',
  en: 'english line',
}

const contentLines = (out) =>
  out
    .split('\n')
    .slice(1, -1)
    .map((line) => line.slice(1, -1).trim())

test('inscription quote: script, transcription, tr, en, attribution in order', () => {
  assert.deepEqual(contentLines(formatQuote(inscription)), [
    '',
    transliterate('täŋri'),
    'täŋri',
    SEPARATOR,
    'türkçe satır',
    'english line',
    '',
    '— Fixture stele, X 1',
    '',
  ])
})

test('rounded frame: every line has the same width, credit sits in the bottom border', () => {
  const lines = formatQuote(inscription).split('\n')
  assert.ok(lines[0].startsWith(`╭─ ${transliterate('tengri')} `))
  assert.ok(lines[0].endsWith('─╮'))
  assert.ok(lines.at(-1).startsWith('╰'))
  assert.ok(lines.at(-1).endsWith('╯'))
  assert.ok(lines.at(-1).includes(CREDIT))
  assert.equal(CREDIT, 'made by Kerem Noras (noras.tech)')
  assert.equal(new Set(lines.map((l) => [...l].length)).size, 1)
})

test('long lines wrap, the frame keeps its width, script wraps between words', () => {
  const quote = {
    ...inscription,
    text: 'tengri teg tengride bolmış türk bilge kagan bu ödke olurtum',
    tr: 'bir iki üç dört beş altı yedi sekiz dokuz on bir iki üç dört beş altı yedi sekiz dokuz on',
  }
  const out = formatQuote(quote, { width: 32 })
  const lines = out.split('\n')
  assert.equal(new Set(lines.map((l) => [...l].length)).size, 1)
  const scriptLines = contentLines(out).filter((l) => l !== SEPARATOR && /^[\u{10C00}-\u{10C4F}⁚]+$/u.test(l))
  assert.ok(scriptLines.length > 1)
  for (const l of scriptLines) assert.equal(l.startsWith(SEPARATOR) || l.endsWith(SEPARATOR), false)
})

test('no ANSI escapes unless color is on', () => {
  assert.equal(formatQuote(inscription).includes('\x1b'), false)
  assert.equal(formatQuote(inscription, { color: true }).includes('\x1b['), true)
})
