import { readFileSync } from 'node:fs'

const load = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'))

// `tiers` are the same drawing at growing sizes (rows of braille); `rows` is the smallest.
const withRows = (item) => ({ ...item, rows: item.tiers[0] })

/** @type {import('./index.js').Motif[]} */
export const motifs = load('motifs').map(withRows)

/** The opening emblem, in three sizes. */
export const emblem = withRows(load('emblem'))
