import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatQuote } from '../src/format.js'
import { transliterate } from '../src/index.js'

const inscription = {
  source: 'Fixture stele',
  ref: 'X 1',
  script: true,
  text: 'täŋri',
  tr: 'türkçe satır',
  en: 'english line',
}

test('inscription quote: script, transcription, tr, en, attribution in order', () => {
  const lines = formatQuote(inscription).split('\n').map((l) => l.trim())
  assert.deepEqual(lines, [
    transliterate('täŋri'),
    'täŋri',
    '',
    'türkçe satır',
    'english line',
    '',
    '— Fixture stele, X 1',
  ])
})

test('non-inscription quote has no script line', () => {
  const out = formatQuote({ ...inscription, script: false })
  assert.equal(out.includes(transliterate('täŋri')), false)
  assert.ok(out.includes('täŋri'))
})

test('no ANSI escapes unless color is on', () => {
  assert.equal(formatQuote(inscription).includes('\x1b'), false)
  assert.equal(formatQuote(inscription, { color: true }).includes('\x1b['), true)
})
