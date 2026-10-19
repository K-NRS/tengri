#!/usr/bin/env node
import { transliterate } from '../src/transliterate.js'
import { formatQuote, MIN_WIDTH, CREDIT } from '../src/format.js'
import { WHISPER, paint } from '../src/style.js'

const USAGE = `tengri            the Tengri emblem, then lines from the Orkhon inscriptions and Kutadgu Bilig
                  (space or → next, ← back, t tamgas, q quit)
tengri <text>     Latin text in Old Turkic script (Turkish or scholarly spelling)
tengri --tamga    full-screen screensaver of tamgas and kilim motifs (any key to stop)`

const args = process.argv.slice(2)
const color = Boolean(process.stdout.isTTY && !process.env.NO_COLOR)
const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY)
const credit = `\n  ${paint(WHISPER, color)(CREDIT)}\n`

const out = (text) => process.stdout.write(text)
const size = () => ({ columns: process.stdout.columns, rows: process.stdout.rows })

// Raw keyboard input, shared by the quote browser and the screensaver.
const openKeys = async () => {
  const { createKeys } = await import('../src/keys.js')
  process.stdin.setRawMode(true)
  process.stdin.resume()
  const keys = createKeys(process.stdin)
  return {
    keys,
    close: () => {
      keys.close()
      process.stdin.setRawMode(false)
      process.stdin.pause()
    },
  }
}

if (args.includes('-h') || args.includes('--help')) {
  console.log(USAGE)
} else if (args.includes('--tamga')) {
  const { motifs, emblem } = await import('../src/motifs.js')
  const { canAnimate } = await import('../src/animate.js')
  const { runTamga } = await import('../src/tamga.js')
  const tty = canAnimate(process.stdout) && process.stdin.isTTY
  const interrupt = new AbortController()
  process.on('SIGINT', () => interrupt.abort())
  process.on('SIGTERM', () => interrupt.abort())
  const input = tty ? await openKeys() : null
  await runTamga({
    list: motifs,
    intro: emblem,
    out,
    read: (signal) => input.keys.read(signal),
    size,
    color,
    tty,
    signal: interrupt.signal,
  })
  input?.close()
  console.log(credit)
} else if (args.length > 0) {
  console.log(transliterate(args.join(' ')))
} else if (interactive) {
  const { quotes } = await import('../src/quotes.js')
  const { motifs, emblem } = await import('../src/motifs.js')
  const { canAnimate } = await import('../src/animate.js')
  const { runTamga } = await import('../src/tamga.js')
  const { browse, keyAction } = await import('../src/browse.js')
  const input = await openKeys()
  const screen = (list, extra = {}) =>
    runTamga({
      list,
      intro: emblem,
      out,
      read: (signal) => input.keys.read(signal),
      size,
      color,
      tty: canAnimate(process.stdout),
      ...extra,
    })
  try {
    // The Tengri emblem opens the session at the screensaver's pace but is held briefly;
    // any key skips it (q quits).
    const skipped = await screen([], { introSpeed: 1.6, introLinger: 0.35 })
    if (!skipped || keyAction(skipped) !== 'quit') {
      await browse(quotes, { out, keys: input.keys, size, color, onTamga: () => screen(motifs) })
    }
  } finally {
    input.close()
  }
} else {
  const { randomQuote } = await import('../src/quotes.js')
  const width = Math.max(MIN_WIDTH, Math.min((process.stdout.columns ?? 80) - 8, 68))
  console.log(`\n${formatQuote(randomQuote(), { color, width })}\n`)
}
