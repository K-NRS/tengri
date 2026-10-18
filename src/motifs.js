import { readFileSync } from 'node:fs'

/** @type {import('./index.js').Motif[]} */
export const motifs = JSON.parse(readFileSync(new URL('../data/motifs.json', import.meta.url), 'utf8'))
