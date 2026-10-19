import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reveal, dissolve, compose, play, canAnimate, pickTier } from '../src/animate.js'
import { motifs, emblem } from '../src/motifs.js'

const rows = ['⣿⣿⣿⣿', '⣿⣿⣿⣿', '⣿⣿⣿⣿']
const shown = (r) => r.flatMap((row, y) => [...row].map((ch, x) => (ch === ' ' ? null : `${x},${y}`)).filter(Boolean))
const noSleep = async () => {}
const ENTER = '\x1b[?1049h\x1b[?25l\x1b[2J'
const LEAVE = '\x1b[?25h\x1b[?1049l'

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

test('motif data: unique ids, two sizes each, credits', () => {
  assert.equal(new Set(motifs.map((m) => m.id)).size, motifs.length)
  assert.ok(motifs.some((m) => m.kind === 'tamga') && motifs.some((m) => m.kind === 'kilim'))
  for (const m of motifs) {
    assert.ok(m.tr && m.en && m.credit, m.id)
    assert.deepEqual(m.tiers.map((t) => [t.length, [...t[0]].length]), [[16, 48], [32, 96]], m.id)
    for (const tier of m.tiers) {
      for (const row of tier) assert.equal([...row].length, [...tier[0]].length, m.id)
      assert.ok(tier.some((r) => /[⠁-⣿]/u.test(r)), `${m.id} is empty`)
    }
    if (m.kind === 'tamga') assert.match(m.credit, /CC0|CC BY-SA 4\.0|public domain/i, m.id)
  }
})

test('emblem data: three sizes and a credit', () => {
  assert.deepEqual(emblem.tiers.map((t) => [t.length, [...t[0]].length]), [[16, 32], [30, 60], [48, 96]])
  assert.match(emblem.credit, /CC0/)
})

test('pickTier takes the biggest drawing the window can hold', () => {
  const [small, large, xl] = emblem.tiers
  assert.equal(pickTier(emblem, { columns: 200, rows: 80 }), xl)
  assert.equal(pickTier(emblem, { columns: 100, rows: 40 }), large)
  assert.equal(pickTier(emblem, { columns: 100, rows: 30 }), small)
  assert.equal(pickTier(emblem, { columns: 60, rows: 80 }), large)
  assert.equal(pickTier(emblem, { columns: 59, rows: 80 }), small)
  assert.equal(pickTier(emblem, { columns: 10, rows: 5 }), small)
  assert.equal(pickTier(motifs[0], { columns: 120, rows: 50 }), motifs[0].tiers[1])
  assert.equal(pickTier(motifs[0], { columns: 80, rows: 50 }), motifs[0].tiers[0])
})

test('the screen needs a TTY that can hold the smallest frame', () => {
  const frame = compose(motifs[0], motifs[0].rows, { indent: 0 })
  const [width, height] = [[...frame[0]].length, frame.length]
  assert.equal(canAnimate({ isTTY: true, columns: width, rows: height + 2 }), true)
  assert.equal(canAnimate({ isTTY: true, columns: width - 1, rows: 60 }), false)
  assert.equal(canAnimate({ isTTY: true, columns: 200, rows: height + 1 }), false)
  assert.equal(canAnimate({ isTTY: false, columns: 200, rows: 60 }), false)
  assert.equal(canAnimate({ isTTY: true }), true)
})

test('without a TTY the intro and every motif print once, smallest size, no escapes', async () => {
  const chunks = []
  await play(motifs, { out: (s) => chunks.push(s), sleep: noSleep, tty: false, intro: emblem })
  const text = chunks.join('')
  assert.equal(text.includes('\x1b'), false)
  assert.ok(text.indexOf(emblem.tr) >= 0 && text.indexOf(emblem.tr) < text.indexOf(motifs[0].tr))
  for (const m of motifs) assert.ok(text.includes(m.tr), m.id)
})

test('on a TTY it takes the alternate screen and always gives it back', async () => {
  const chunks = []
  await play(motifs.slice(0, 2), { out: (s) => chunks.push(s), sleep: noSleep, tty: true, size: () => ({ columns: 80, rows: 30 }) })
  assert.equal(chunks[0], ENTER)
  assert.equal(chunks.at(-1), LEAVE)

  const failing = []
  await assert.rejects(
    play(motifs, {
      out: (s) => failing.push(s),
      sleep: async () => {
        throw new Error('boom')
      },
      tty: true,
    }),
  )
  assert.equal(failing.at(-1), LEAVE)
})

test('frames are centred in the window', async () => {
  const chunks = []
  const window = { columns: 100, rows: 40 }
  await play(motifs.slice(0, 1), { out: (s) => chunks.push(s), sleep: noSleep, tty: true, size: () => window })
  const frame = chunks.find((c) => /^\x1b\[\d+;\d+H/.test(c))
  const [, top, left] = frame.match(/^\x1b\[(\d+);(\d+)H/)
  const art = pickTier(motifs[0], window)
  const width = Math.max(52, [...art[0]].length)
  assert.equal(Number(top), Math.floor((window.rows - (art.length + 2)) / 2) + 1)
  assert.equal(Number(left), Math.floor((window.columns - width) / 2) + 1)
  assert.equal(frame.split('H').length - 1, art.length + 2, 'one positioned line per frame row')
})

test('a bigger window gets the bigger drawing, and a resize clears the screen', async () => {
  let window = { columns: 80, rows: 30 }
  const chunks = []
  const resizeAfter = 20
  let ticks = 0
  const sleep = async () => {
    if (++ticks === resizeAfter) window = { columns: 140, rows: 50 }
  }
  await play(motifs.slice(0, 1), { out: (s) => chunks.push(s), sleep, tty: true, size: () => window })
  const clears = chunks.filter((c) => c === '\x1b[2J').length
  assert.equal(clears, 2, 'once on entering, once more after the resize')
  const lastFrame = chunks.filter((c) => /^\x1b\[\d+;\d+H/.test(c)).at(-1)
  assert.equal(lastFrame.split('H').length - 1, motifs[0].tiers[1].length + 2)
})

test('aborting stops it at once and still leaves the screen', async () => {
  const controller = new AbortController()
  const chunks = []
  let ticks = 0
  const sleep = async () => {
    if (++ticks === 5) controller.abort()
  }
  await play(motifs, { out: (s) => chunks.push(s), sleep, tty: true, signal: controller.signal, loops: Infinity })
  assert.equal(ticks, 5)
  assert.equal(chunks.at(-1), LEAVE)
})

test('loops repeat the whole list on a TTY', async () => {
  const count = async (loops) => {
    let ticks = 0
    await play(motifs.slice(0, 1), { out: () => {}, sleep: async () => void ticks++, tty: true, loops })
    return ticks
  }
  const [one, two] = [await count(1), await count(2)]
  assert.equal(two, one * 2)
})

test('it is slow: seconds per motif, longer for the intro', async () => {
  const time = async (opts) => {
    let total = 0
    await play(motifs.slice(0, 1), { out: () => {}, sleep: async (ms) => void (total += ms), tty: true, ...opts })
    return total
  }
  const [plain, withIntro] = [await time({}), await time({ intro: emblem })]
  assert.ok(plain >= 8000, `${plain} ms`)
  assert.ok(withIntro - plain > 10000, `${withIntro - plain} ms`)
})
