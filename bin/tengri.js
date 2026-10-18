#!/usr/bin/env node
import { transliterate } from '../src/transliterate.js'
import { formatQuote } from '../src/format.js'

const USAGE = `tengri            a line from the Orkhon inscriptions or Kutadgu Bilig
tengri <text>     Latin text in Old Turkic script (Turkish or scholarly spelling)`

const args = process.argv.slice(2)

if (args.includes('-h') || args.includes('--help')) {
  console.log(USAGE)
} else if (args.length > 0) {
  console.log(transliterate(args.join(' ')))
} else {
  const { randomQuote } = await import('../src/quotes.js')
  const width = Math.max(30, Math.min((process.stdout.columns ?? 80) - 4, 72))
  const color = process.stdout.isTTY && !process.env.NO_COLOR
  console.log(`\n${formatQuote(randomQuote(), { color, width })}\n`)
}
