import { test } from 'node:test'
import assert from 'node:assert/strict'
import { browse, keyAction } from '../src/browse.js'
import { quotes } from '../src/quotes.js'

const HIDE = '\x1b[?25l'
const SHOW = '\x1b[?25h'

const run = async (keys, { list = quotes, size, onTamga } = {}) => {
  const chunks = []
  await browse(list, {
    out: (s) => chunks.push(s),
    keys: (async function* () {
      yield* keys
    })(),
    random: () => 0,
    size,
    onTamga,
  })
  return chunks
}

const first = (chunk) => chunk.match(/— (.+?)(?= *│)/)?.[1]
const shownRefs = (chunks) => chunks.map(first).filter(Boolean)

test('keys: space, enter and right/down arrows go forward; left/up go back; q, Esc and Ctrl-C quit', () => {
  for (const key of [' ', '\r', '\x1b[C', '\x1b[B']) assert.equal(keyAction(key), 'next', JSON.stringify(key))
  for (const key of ['\x1b[D', '\x1b[A']) assert.equal(keyAction(key), 'prev', JSON.stringify(key))
  for (const key of ['t', 'T']) assert.equal(keyAction(key), 'tamga', JSON.stringify(key))
  for (const key of ['q', 'Q', '\x1b', '\x03']) assert.equal(keyAction(key), 'quit', JSON.stringify(key))
  for (const key of ['x', '\x1b[Z', '']) assert.equal(keyAction(key), null, JSON.stringify(key))
})

test('it shows one quote, moves on with space, back with the left arrow, and quits with q', async () => {
  const chunks = await run([' ', ' ', '\x1b[D', 'q'])
  const refs = shownRefs(chunks)
  // first, next, next, back, then the final redraw without the hint
  assert.equal(refs.length, 5)
  assert.equal(refs[1], refs[3])
  assert.notEqual(refs[0], refs[1])
  assert.notEqual(refs[1], refs[2])
  assert.equal(refs[4], refs[3], 'the quote stays on screen when you quit')
})

test('unknown keys change nothing', async () => {
  const chunks = await run(['x', '\x1b[Z', 'q'])
  assert.equal(shownRefs(chunks).length, 2, 'the first draw and the final one')
})

test('going back from the first quote wraps to the last, forward from the last wraps to the first', async () => {
  const back = shownRefs(await run(['\x1b[D', 'q']))
  const forwardAll = shownRefs(await run([...Array(quotes.length).fill(' '), 'q']))
  assert.notEqual(back[0], back[1])
  assert.equal(forwardAll[0], forwardAll[quotes.length], 'a full lap lands on the first quote again')
})

test('the hint shows while browsing and is gone from the last frame; the cursor is hidden and restored', async () => {
  const chunks = await run([' ', 'q'])
  assert.equal(chunks[0], HIDE)
  assert.equal(chunks.at(-1), SHOW)
  const draws = chunks.filter((c) => c.includes('╭'))
  assert.ok(draws.slice(0, -1).every((c) => c.includes('q  quit')))
  assert.equal(draws.at(-1).includes('q  quit'), false)
})

test('redraws rewind exactly over what was drawn, even when the next quote is shorter', async () => {
  const short = { ...quotes[0], tr: 'kısa', en: 'short', text: 'tengri' }
  const long = { ...quotes[0], tr: 'uzun '.repeat(60), en: 'long '.repeat(60) }
  const frames = (c) => c.split('\n').length - 1
  const heightOf = async (quote) => frames((await run(['q'], { list: [quote] })).find((c) => c.includes('╭')))
  const [hShort, hLong] = [await heightOf(short), await heightOf(long)]
  assert.ok(hLong > hShort)

  // random() => 0 deals the long quote first, then the short one
  const draws = (await run([' ', 'q'], { list: [short, long] })).filter((c) => c.includes('╭'))
  const rewound = (c) => Number(c.match(/^\x1b\[(\d+)A/)?.[1])
  assert.equal(draws.length, 3)
  assert.equal(rewound(draws[1]), hLong, 'the second draw rewinds over the long frame')
  assert.ok(draws[1].includes(`\x1b[${hLong - hShort}A`), 'and winds back over the lines the short frame leaves blank')
  assert.equal(rewound(draws[2]), hShort, 'the final redraw rewinds over the short frame')
})

test('the frame follows the window width', async () => {
  const wide = await run(['q'], { size: () => ({ columns: 200 }) })
  const narrow = await run(['q'], { size: () => ({ columns: 50 }) })
  const width = (chunks) => [...chunks.find((c) => c.includes('╭')).split('\n').find((l) => l.includes('╭')).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')].length
  assert.ok(width(wide) > width(narrow))
})

test('t runs the screensaver and the browser comes back to the same quote', async () => {
  let runs = 0
  const chunks = await run(['t', 'q'], { onTamga: async () => (runs++, ' ') })
  assert.equal(runs, 1)
  const refs = shownRefs(chunks)
  assert.equal(refs.length, 3, 'first draw, redraw after the screensaver, final draw')
  assert.equal(refs[0], refs[1])
  assert.ok(chunks.filter((c) => c.includes('╭')).every((c) => c.includes('t  tamga') || !c.includes('q  quit')))
})

test('q or Ctrl-C inside the screensaver quits the browser too', async () => {
  for (const stopper of ['q', '\x03', '\x1b']) {
    let keysAfter = 0
    const chunks = []
    await browse(quotes, {
      out: (s) => chunks.push(s),
      keys: (async function* () {
        yield 't'
        keysAfter++
        yield ' '
      })(),
      random: () => 0,
      onTamga: async () => stopper,
    })
    assert.equal(keysAfter, 0, `no more keys were read after ${JSON.stringify(stopper)}`)
    assert.equal(chunks.at(-1), SHOW)
  }
})

test('without a screensaver the t key does nothing', async () => {
  const chunks = await run(['t', 'q'])
  assert.equal(shownRefs(chunks).length, 2, 'the first draw and the final one')
})
