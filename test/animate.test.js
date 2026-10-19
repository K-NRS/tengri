import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reveal, dissolve, compose, play, canAnimate } from '../src/animate.js'
import { motifs } from '../src/motifs.js'

const rows = ['⣿⣿⣿⣿', '⣿⣿⣿⣿', '⣿⣿⣿⣿']
const shown = (r) => r.flatMap((row, y) => [...row].map((ch, x) => (ch === ' ' ? null : `${x},${y}`)).filter(Boolean))

for (const mode of ['diagonal', 'radial']) {
  test(`reveal (${mode}): nothing at 0, everything at 1, only ever growing`, () => {
    assert.deepEqual(shown(reveal(rows, 0, mode)), [])
    assert.deepEqual(reveal(rows, 1, mode), rows)
    const [a, b] = [shown(reveal(rows, 0.3, mode)), shown(reveal(rows, 0.6, mode))]
    assert.ok(a.length > 0 && a.length < b.length)
    for (const cell of a) assert.ok(b.includes(cell))
  })
}

test('radial reveal starts in the middle', () => {
  const grid = Array(9).fill('⣿'.repeat(21))
  const first = shown(reveal(grid, 0.1, 'radial'))
  assert.ok(first.length > 0)
  for (const cell of first) {
    const [x, y] = cell.split(',').map(Number)
    assert.ok(Math.abs(x - 10) <= 6 && Math.abs(y - 4) <= 3, cell)
  }
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

test('loops repeat the whole list on a TTY', async () => {
  const count = async (loops) => {
    const chunks = []
    await play(motifs.slice(0, 1), { out: (s) => chunks.push(s), sleep: async () => {}, tty: true, loops })
    return chunks.length
  }
  const [one, two] = [await count(1), await count(2)]
  assert.ok(two > one * 1.9)
})

test('the animation is slow: seconds per motif, not frames', async () => {
  let total = 0
  await play(motifs.slice(0, 1), { out: () => {}, sleep: async (ms) => void (total += ms), tty: true })
  assert.ok(total >= 8000, `${total} ms`)
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
    assert.equal(m.rows.length, 16, m.id)
    for (const row of m.rows) assert.equal([...row].length, 48, m.id)
    assert.ok(m.rows.some((r) => /[⠁-⣿]/u.test(r)), `${m.id} is empty`)
    if (m.kind === 'tamga') assert.match(m.credit, /CC0|CC BY-SA 4\.0|public domain/i, m.id)
  }
})

test('animation needs a TTY at least as wide as one frame line', () => {
  const frame = compose(motifs[0], motifs[0].rows)
  const [width, height] = [frame[0].length, frame.length]
  assert.equal(canAnimate({ isTTY: true, columns: width, rows: height + 2 }), true)
  assert.equal(canAnimate({ isTTY: true, columns: width - 1, rows: 60 }), false)
  assert.equal(canAnimate({ isTTY: true, columns: 200, rows: height }), false)
  assert.equal(canAnimate({ isTTY: false, columns: 200, rows: 60 }), false)
  assert.equal(canAnimate({ isTTY: true }), true)
})
