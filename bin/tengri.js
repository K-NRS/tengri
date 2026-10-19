#!/usr/bin/env node
import { transliterate } from '../src/transliterate.js'
import { formatQuote, MIN_WIDTH, CREDIT } from '../src/format.js'
import { WHISPER, paint } from '../src/style.js'

const USAGE = `tengri            a line from the Orkhon inscriptions or Kutadgu Bilig; space or → next, ← back, q quit
tengri <text>     Latin text in Old Turkic script (Turkish or scholarly spelling)
tengri --tamga    full-screen screensaver of tamgas and kilim motifs (any key to stop)`

const args = process.argv.slice(2)
const color = Boolean(process.stdout.isTTY && !process.env.NO_COLOR)

if (args.includes('-h') || args.includes('--help')) {
  console.log(USAGE)
} else if (args.includes('--tamga')) {
  const { motifs, emblem } = await import('../src/motifs.js')
  const { play, canAnimate } = await import('../src/animate.js')
  const tty = canAnimate(process.stdout)
  const controller = new AbortController()
  const stop = () => controller.abort()
  const sleep = (ms) =>
    new Promise((resolve) => {
      const timer = setTimeout(resolve, ms)
      controller.signal.addEventListener('abort', () => (clearTimeout(timer), resolve()), { once: true })
    })
  if (tty) {
    process.on('SIGINT', stop)
    process.on('SIGTERM', stop)
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.once('data', stop)
    }
  }
  await play(motifs, {
    out: (text) => process.stdout.write(text),
    sleep,
    tty,
    color,
    loops: tty ? Infinity : 1,
    intro: emblem,
    size: () => ({ columns: process.stdout.columns, rows: process.stdout.rows }),
    signal: controller.signal,
  })
  if (tty && process.stdin.isTTY) {
    process.stdin.setRawMode(false)
    process.stdin.pause()
  }
  console.log(`\n  ${paint(WHISPER, color)(CREDIT)}\n`)
} else if (args.length > 0) {
  console.log(transliterate(args.join(' ')))
} else if (process.stdin.isTTY && process.stdout.isTTY) {
  const { quotes } = await import('../src/quotes.js')
  const { browse } = await import('../src/browse.js')
  const { on } = await import('node:events')
  process.stdin.setRawMode(true)
  process.stdin.resume()
  const keys = on(process.stdin, 'data')
  try {
    await browse(quotes, {
      out: (text) => process.stdout.write(text),
      keys: (async function* () {
        for await (const [chunk] of keys) yield chunk
      })(),
      size: () => ({ columns: process.stdout.columns }),
      color,
    })
  } finally {
    process.stdin.setRawMode(false)
    process.stdin.pause()
  }
} else {
  const { randomQuote } = await import('../src/quotes.js')
  const width = Math.max(MIN_WIDTH, Math.min((process.stdout.columns ?? 80) - 8, 68))
  console.log(`\n${formatQuote(randomQuote(), { color, width })}\n`)
}
