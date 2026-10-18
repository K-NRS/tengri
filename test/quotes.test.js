import { test } from 'node:test'
import assert from 'node:assert/strict'
import { quotes, randomQuote } from '../src/quotes.js'
import { transliterate } from '../src/index.js'

test('every quote has the fields the CLI prints', () => {
  for (const q of quotes) {
    for (const field of ['id', 'source', 'ref', 'text', 'tr', 'en']) {
      assert.equal(typeof q[field], 'string', `${q.id}.${field}`)
      assert.ok(q[field].trim(), `${q.id}.${field} is empty`)
    }
    assert.ok(['original', 'stylized'].includes(q.script), `${q.id}.script`)
  }
})

test('ids are unique', () => {
  assert.equal(new Set(quotes.map((q) => q.id)).size, quotes.length)
})

test('every quote transliterates fully: no Latin letter is left over', () => {
  for (const q of quotes) {
    const out = transliterate(q.text)
    assert.equal(/\p{L}/u.test(out.replace(/[\u{10C00}-\u{10C4F}]/gu, '')), false, `${q.id}: ${out}`)
  }
})

test('script is original only for the inscriptions, stylized for Kutadgu Bilig', () => {
  for (const q of quotes) {
    assert.equal(q.script, q.source === 'Kutadgu Bilig' ? 'stylized' : 'original', q.id)
  }
})

test('randomQuote picks by the injected random source', () => {
  assert.equal(randomQuote(() => 0), quotes[0])
  assert.equal(randomQuote(() => 0.999999), quotes.at(-1))
})
