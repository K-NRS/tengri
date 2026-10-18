import { WHISPER, paint } from './style.js'

const HIDDEN = ' '
const WIDTH = 52
const LINE_WIDTH = WIDTH + 2
const FRAME_ROWS = 19 // 16 art rows, a blank line, caption, credit

const REVEAL_STEPS = 48
const HOLD_FRAMES = 36
const DISSOLVE_STEPS = 36
const FRAME_MS = 70
const HOLD_FRAME_MS = 100
const GAP_MS = 700

// 256-colour golds, dark to bright and back: the symbol slowly breathes while it is held.
const BREATH = [136, 137, 172, 178, 179, 214, 220, 221, 222, 221, 220, 214, 179, 178, 172, 137]
const goldAt = (tone) => `1;38;5;${BREATH[((tone % BREATH.length) + BREATH.length) % BREATH.length]}`

/** In-place redraw breaks when a line wraps or the frame is taller than the window. */
export const canAnimate = ({ isTTY, columns, rows }) =>
  Boolean(isTTY) && (columns ?? 80) >= LINE_WIDTH && (rows ?? 40) >= FRAME_ROWS + 2

const hash = (n) => {
  let x = Math.imul(n + 1, 2654435761) >>> 0
  x = Math.imul(x ^ (x >>> 15), 2246822519) >>> 0
  x ^= x >>> 13
  return (x >>> 0) / 4294967296
}

const mapCells = (rows, visible) =>
  rows.map((row, y) => [...row].map((ch, x) => (visible(x, y) ? ch : HIDDEN)).join(''))

/**
 * Wipe in: nothing at t=0, every cell at t=1. `diagonal` sweeps from the top
 * left, `radial` grows out from the middle (cells are about twice as tall as wide).
 */
export const reveal = (rows, t, mode = 'diagonal') => {
  const width = [...rows[0]].length
  const cx = (width - 1) / 2
  const cy = (rows.length - 1) / 2
  const key =
    mode === 'radial' ? (x, y) => Math.hypot(x - cx, (y - cy) * 2) : (x, y) => x + y * 3
  const max = mode === 'radial' ? Math.hypot(cx, cy * 2) : width - 1 + (rows.length - 1) * 3
  return mapCells(rows, (x, y) => key(x, y) < t * (max + 1))
}

/** Random dissolve: every cell at t=0, nothing at t=1. */
export const dissolve = (rows, t, seed = 0) =>
  mapCells(rows, (x, y) => hash(y * 1000 + x + seed * 7919) >= t)

const center = (text, width) => {
  const gap = Math.max(0, width - [...text].length)
  return ' '.repeat(Math.floor(gap / 2)) + text + ' '.repeat(Math.ceil(gap / 2))
}

/** The lines of one frame: art, then caption and credit once `captionOn`. */
export const compose = (motif, art, { captionOn = true, color = false, tone = 8 } = {}) => {
  const gold = paint(goldAt(tone), color)
  const whisper = paint(WHISPER, color)
  const blank = ' '.repeat(WIDTH)
  const caption = captionOn
    ? [paint(goldAt(8), color)(center(`${motif.tr} · ${motif.en}`, WIDTH)), whisper(center(motif.credit, WIDTH))]
    : [blank, blank]
  return [...art.map((row) => gold(center(row, WIDTH))), blank, ...caption].map((line) => `  ${line}`)
}

const up = (n) => `\x1b[${n}A\r`
const clearLine = '\x1b[2K'

/**
 * A slow screensaver: each motif wipes in, glows while held, then dissolves,
 * and the list repeats `loops` times (Infinity until interrupted). Without a
 * TTY each motif is printed once, with no escape codes.
 */
export const play = async (list, { out, sleep, tty, color = false, loops = 1 }) => {
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
    let tone = 0
    for (let round = 0; round < loops; round++) {
      for (const [i, motif] of list.entries()) {
        const mode = i % 2 ? 'radial' : 'diagonal'
        for (let s = 1; s <= REVEAL_STEPS; s++) {
          const art = reveal(motif.rows, s / REVEAL_STEPS, mode)
          draw(compose(motif, art, { captionOn: false, color, tone: tone++ >> 2 }))
          await sleep(FRAME_MS)
        }
        for (let f = 0; f < HOLD_FRAMES; f++) {
          draw(compose(motif, motif.rows, { color, tone: tone++ >> 2 }))
          await sleep(HOLD_FRAME_MS)
        }
        for (let s = 1; s <= DISSOLVE_STEPS; s++) {
          const art = dissolve(motif.rows, s / DISSOLVE_STEPS, i + round)
          draw(compose(motif, art, { captionOn: s < DISSOLVE_STEPS / 3, color, tone: tone++ >> 2 }))
          await sleep(FRAME_MS)
        }
        await sleep(GAP_MS)
      }
    }
  } finally {
    out('\x1b[?25h')
  }
}
