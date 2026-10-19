import { readFileSync } from 'node:fs'

/** @type {import('./index.js').Motif[]} */
export const motifs = JSON.parse(readFileSync(new URL('../data/motifs.json', import.meta.url), 'utf8'))

/** The opening emblem: `large` (30 rows) and `small` (16 rows) braille versions. */
export const emblem = JSON.parse(readFileSync(new URL('../data/emblem.json', import.meta.url), 'utf8'))
