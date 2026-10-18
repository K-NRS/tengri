import { readFileSync } from 'node:fs'

/** @type {import('./index.js').Quote[]} */
export const quotes = JSON.parse(readFileSync(new URL('../data/quotes.json', import.meta.url), 'utf8'))

export const randomQuote = (random = Math.random) => quotes[Math.floor(random() * quotes.length)]
