import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runTamga } from '../src/tamga.js'
import { motifs, emblem } from '../src/motifs.js'

const LEAVE = '\x1b[?25h\x1b[?1049l'

// A reader that gives `key` after `after` sleeps, like a person pressing a key.
// (Driven from sleep itself: with instant fake sleeps no timer would ever fire.)
const scripted = (key, after) => {
  let sleeps = 0
  let press
  return {
    sleep: async () => {
      if (++sleeps === after) press?.(key)
    },
    read: (signal) =>
      new Promise((resolve) => {
        press = resolve
        signal.addEventListener('abort', () => resolve(null), { once: true })
      }),
  }
}

test('a key stops the screensaver and comes back as the result', async () => {
  const chunks = []
  const { sleep, read } = scripted('x', 30)
  const key = await runTamga({ list: motifs, intro: emblem, out: (s) => chunks.push(s), read, sleep, tty: true, size: () => ({ columns: 120, rows: 50 }) })
  assert.equal(key, 'x')
  assert.equal(chunks.at(-1), LEAVE)
})

test('an interrupt signal stops it and reads as Ctrl-C', async () => {
  const controller = new AbortController()
  let sleeps = 0
  const key = await runTamga({
    list: motifs,
    out: () => {},
    read: () => new Promise(() => {}),
    sleep: async () => {
      if (++sleeps === 5) controller.abort()
    },
    tty: true,
    signal: controller.signal,
  })
  assert.equal(key, '\x03')
})

test('a read that is still waiting is released, so the next key is not swallowed', async () => {
  let released = false
  await runTamga({
    list: [],
    intro: emblem,
    introSpeed: 0.45,
    out: () => {},
    read: (signal) =>
      new Promise((resolve) => signal.addEventListener('abort', () => ((released = true), resolve(null)), { once: true })),
    sleep: async () => {},
    tty: true,
  })
  assert.equal(released, true)
})

test('an intro alone plays once and ends by itself, without a key', async () => {
  const chunks = []
  const key = await runTamga({
    list: [],
    intro: emblem,
    introSpeed: 0.45,
    out: (s) => chunks.push(s),
    read: () => new Promise(() => {}),
    sleep: async () => {},
    tty: true,
  })
  assert.equal(key, null)
  const mark = emblem.tiers[0].find((row) => /[⠁-⣿]/u.test(row)).trim()
  assert.ok(chunks.some((c) => c.includes(mark.slice(0, 8))), 'the emblem was drawn')
  assert.equal(chunks.at(-1), LEAVE)
})

test('the short intro is much shorter than the screensaver intro', async () => {
  const time = async (introSpeed) => {
    let total = 0
    await runTamga({
      list: [],
      intro: emblem,
      introSpeed,
      out: () => {},
      read: () => new Promise(() => {}),
      sleep: async (ms) => void (total += ms),
      tty: true,
    })
    return total
  }
  const [short, long] = [await time(0.45), await time(1.6)]
  assert.ok(short > 3000 && short < 5000, `${short} ms`)
  assert.ok(long > 3 * short)
})

test('without a TTY it prints once and reads nothing', async () => {
  const chunks = []
  let reads = 0
  const key = await runTamga({
    list: motifs,
    intro: emblem,
    out: (s) => chunks.push(s),
    read: () => void reads++,
    sleep: async () => {},
    tty: false,
  })
  assert.equal(key, null)
  assert.equal(reads, 0)
  assert.equal(chunks.join('').includes('\x1b'), false)
})
