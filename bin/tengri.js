#!/usr/bin/env node
import { transliterate } from '../src/transliterate.js'
import { formatQuote, MIN_WIDTH, CREDIT } from '../src/format.js'
import { WHISPER, paint } from '../src/style.js'

const USAGE = `tengri            a line from the Orkhon inscriptions or Kutadgu Bilig
tengri <text>     Latin text in Old Turkic script (Turkish or scholarly spelling)
tengri --tamga    tamgas and kilim motifs as a slow screensaver (Ctrl-C to stop)`

const args = process.argv.slice(2)
const color = Boolean(process.stdout.isTTY && !process.env.NO_COLOR)

if (args.includes('-h') || args.includes('--help')) {
  console.log(USAGE)
} else if (args.includes('--tamga')) {
  const { motifs } = await import('../src/motifs.js')
  const { play, canAnimate } = await import('../src/animate.js')
  const credit = `\n  ${paint(WHISPER, color)(CREDIT)}\n`
  process.on('SIGINT', () => {
    process.stdout.write(`\x1b[?25h\n${credit}`)
    process.exit(130)
  })
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const tty = canAnimate(process.stdout)
  await play(motifs, { out: (text) => process.stdout.write(text), sleep, tty, color, loops: tty ? Infinity : 1 })
  console.log(credit)
} else if (args.length > 0) {
  console.log(transliterate(args.join(' ')))
} else {
  const { randomQuote } = await import('../src/quotes.js')
  const width = Math.max(MIN_WIDTH, Math.min((process.stdout.columns ?? 80) - 8, 68))
  console.log(`\n${formatQuote(randomQuote(), { color, width })}\n`)
}
