import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reveal, dissolve, compose, play, canAnimate } from '../src/animate.js'
import { motifs } from '../src/motifs.js'

const rows = ['⣿⣿⣿⣿', '⣿⣿⣿⣿', '⣿⣿⣿⣿']
const shown = (r) => r.flatMap((row, y) => [...row].map((ch, x) => (ch === ' ' ? null : `${x},${y}`)).filter(Boolean))

test('reveal: nothing at 0, everything at 1, only ever growing', () => {
  assert.deepEqual(shown(reveal(rows, 0)), [])
  assert.deepEqual(reveal(rows, 1), rows)
  const [a, b] = [shown(reveal(rows, 0.3)), shown(reveal(rows, 0.6))]
  assert.ok(a.length > 0 && a.length < b.length)
  for (const cell of a) assert.ok(b.includes(cell))
})

test('dissolve: everything at 0, nothing at 1, only ever shrinking', () => {
  assert.deepEqual(dissolve(rows, 0), rows)
  assert.deepEqual(shown(dissolve(rows, 1)), [])
  const [a, b] = [shown(dissolve(rows, 0.3, 2)), shown(dissolve(rows, 0.6, 2))]
  assert.ok(b.length < a.length)
  for (const cell of b) assert.ok(a.includes(cell))
})

test('every frame has the same number of lines and the same width', () => {
  const motif = motifs[0]
  const full = compose(motif, motif.rows)
  const bare = compose(motif, reveal(motif.rows, 0.4), { captionOn: false })
  assert.equal(full.length, bare.length)
  assert.equal(new Set([...full, ...bare].map((l) => [...l].length)).size, 1)
  assert.ok(full.join('\n').includes(motif.tr))
  assert.equal(bare.join('\n').includes(motif.tr), false)
})

test('play without a TTY prints each motif once, no escape codes', async () => {
  const chunks = []
  await play(motifs, { out: (s) => chunks.push(s), sleep: async () => {}, tty: false })
  const text = chunks.join('')
  assert.equal(text.includes('\x1b'), false)
  for (const m of motifs) assert.ok(text.includes(m.tr), m.id)
})

test('play on a TTY redraws in place and always restores the cursor', async () => {
  const chunks = []
  await play(motifs.slice(0, 2), { out: (s) => chunks.push(s), sleep: async () => {}, tty: true })
  assert.equal(chunks[0], '\x1b[?25l')
  assert.equal(chunks.at(-1), '\x1b[?25h')
  assert.ok(chunks.some((c) => /\x1b\[\d+A/.test(c)))

  const failing = []
  await assert.rejects(
    play(motifs, {
      out: (s) => failing.push(s),
      sleep: async () => {
        throw new Error('interrupted')
      },
      tty: true,
    }),
  )
  assert.equal(failing.at(-1), '\x1b[?25h')
})

test('motif data: unique ids, uniform grids, credits', () => {
  assert.equal(new Set(motifs.map((m) => m.id)).size, motifs.length)
  assert.ok(motifs.some((m) => m.kind === 'tamga') && motifs.some((m) => m.kind === 'kilim'))
  for (const m of motifs) {
    assert.ok(m.tr && m.en && m.credit, m.id)
    assert.equal(m.rows.length, 12, m.id)
    for (const row of m.rows) assert.equal([...row].length, 32, m.id)
    assert.ok(m.rows.some((r) => /[⠁-⣿]/u.test(r)), `${m.id} is empty`)
    if (m.kind === 'tamga') assert.match(m.credit, /CC0|public domain/i, m.id)
  }
})

test('animation needs a TTY at least as wide as one frame line', () => {
  const width = compose(motifs[0], motifs[0].rows)[0].length
  assert.equal(canAnimate({ isTTY: true, columns: width }), true)
  assert.equal(canAnimate({ isTTY: true, columns: width - 1 }), false)
  assert.equal(canAnimate({ isTTY: false, columns: 200 }), false)
  assert.equal(canAnimate({ isTTY: true, columns: undefined }), true)
})
