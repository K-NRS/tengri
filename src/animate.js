import { GOLD, WHISPER, paint } from './style.js'

const HIDDEN = ' '
const WIDTH = 44
const REVEAL_STEPS = 14
const DISSOLVE_STEPS = 10
const FRAME_MS = 35
const HOLD_MS = 1000

const hash = (n) => {
  let x = Math.imul(n + 1, 2654435761) >>> 0
  x = Math.imul(x ^ (x >>> 15), 2246822519) >>> 0
  x ^= x >>> 13
  return (x >>> 0) / 4294967296
}

const mapCells = (rows, visible) =>
  rows.map((row, y) => [...row].map((ch, x) => (visible(x, y) ? ch : HIDDEN)).join(''))

/** Diagonal wipe: nothing at t=0, every cell at t=1. */
export const reveal = (rows, t) => {
  const width = [...rows[0]].length
  const keys = width + (rows.length - 1) * 3
  return mapCells(rows, (x, y) => x + y * 3 < t * keys)
}

/** Random dissolve: every cell at t=0, nothing at t=1. */
export const dissolve = (rows, t, seed = 0) =>
  mapCells(rows, (x, y) => hash(y * 1000 + x + seed * 7919) >= t)

const center = (text, width) => {
  const gap = Math.max(0, width - [...text].length)
  return ' '.repeat(Math.floor(gap / 2)) + text + ' '.repeat(Math.ceil(gap / 2))
}

/** The lines of one frame: art, then caption and credit once `captionOn`. */
export const compose = (motif, art, { captionOn = true, color = false } = {}) => {
  const gold = paint(GOLD, color)
  const whisper = paint(WHISPER, color)
  const blank = ' '.repeat(WIDTH)
  const caption = captionOn
    ? [gold(center(`${motif.tr} · ${motif.en}`, WIDTH)), whisper(center(motif.credit, WIDTH))]
    : [blank, blank]
  return [...art.map((row) => gold(center(row, WIDTH))), blank, ...caption].map((line) => `  ${line}`)
}

const up = (n) => `\x1b[${n}A\r`
const clearLine = '\x1b[2K'

/**
 * Draws every motif in turn: wipe in, hold, dissolve. On a TTY the frame is
 * redrawn in place; otherwise each motif is printed once, with no escapes.
 */
export const play = async (list, { out, sleep, tty, color = false }) => {
  if (!tty) {
    for (const motif of list) out(compose(motif, motif.rows, { color }).join('\n') + '\n\n')
    return
  }
  out('\x1b[?25l')
  try {
    let drawn = false
    const draw = (lines) => {
      out((drawn ? up(lines.length) : '') + lines.map((l) => clearLine + l).join('\n') + '\n')
      drawn = true
    }
    for (const [i, motif] of list.entries()) {
      for (let s = 1; s <= REVEAL_STEPS; s++) {
        draw(compose(motif, reveal(motif.rows, s / REVEAL_STEPS), { captionOn: s === REVEAL_STEPS, color }))
        await sleep(FRAME_MS)
      }
      await sleep(HOLD_MS)
      for (let s = 1; s <= DISSOLVE_STEPS; s++) {
        draw(compose(motif, dissolve(motif.rows, s / DISSOLVE_STEPS, i), { captionOn: s < DISSOLVE_STEPS / 2, color }))
        await sleep(FRAME_MS)
      }
    }
  } finally {
    out('\x1b[?25h')
  }
}
