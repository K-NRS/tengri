import { paint } from './style.js'

const HIDDEN = ' '
const WIDTH = 52
const FRAME_ROWS = 18 // 16 art rows, a blank line, the caption

const REVEAL_STEPS = 48
const HOLD_FRAMES = 36
const DISSOLVE_STEPS = 36
const FRAME_MS = 70
const HOLD_FRAME_MS = 100
const GAP_MS = 700

const ENTER = '\x1b[?1049h\x1b[?25l\x1b[2J'
const LEAVE = '\x1b[?25h\x1b[?1049l'
const CLEAR = '\x1b[2J'

// 256-colour golds, dark to bright and back: the symbol slowly breathes while it is held.
const BREATH = [136, 137, 172, 178, 179, 214, 220, 221, 222, 221, 220, 214, 179, 178, 172, 137]
const goldAt = (tone) => `1;38;5;${BREATH[((tone % BREATH.length) + BREATH.length) % BREATH.length]}`

/** The screen needs a TTY that can hold the smallest frame. */
export const canAnimate = ({ isTTY, columns, rows }) =>
  Boolean(isTTY) && (columns ?? 80) >= WIDTH && (rows ?? 40) >= FRAME_ROWS + 2

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

const textWidth = (rows) => Math.max(WIDTH, [...rows[0]].length)
const frameHeight = (rows) => rows.length + 2

/** The biggest drawing of an item that fits the window, with a row to spare. */
export const pickTier = ({ tiers }, { columns = 80, rows = 40 } = {}) =>
  [...tiers].reverse().find((t) => textWidth(t) <= columns && frameHeight(t) <= rows - 1) ?? tiers[0]

const center = (text, width) => {
  const gap = Math.max(0, width - [...text].length)
  return ' '.repeat(Math.floor(gap / 2)) + text + ' '.repeat(Math.ceil(gap / 2))
}

/**
 * The lines of one frame: art, a blank line, then the caption once `captionOn`
 * (none at all when the item says `caption: false`). Credits live in the data and the README.
 */
export const compose = (motif, art, { captionOn = true, color = false, tone = 8, indent = 2 } = {}) => {
  const width = textWidth(art)
  const gold = paint(goldAt(tone), color)
  const pad = ' '.repeat(indent)
  if (motif.caption === false) return art.map((row) => pad + gold(center(row, width)))
  const blank = ' '.repeat(width)
  const caption = captionOn ? [paint(goldAt(8), color)(center(`${motif.tr} · ${motif.en}`, width))] : [blank]
  return [...art.map((row) => gold(center(row, width))), blank, ...caption].map((line) => pad + line)
}

const STOP = Symbol('stop')

/**
 * A slow full-screen screensaver on the terminal's alternate screen, centred
 * and redrawn to the current window size. The optional `intro` (the emblem)
 * opens it once (`introSpeed` scales its length); then each motif wipes in,
 * glows while held, and dissolves, and the list repeats `loops` times (Infinity until `signal` aborts). Without
 * a TTY everything is printed once, smallest size, with no escape codes.
 */
export const play = async (
  list,
  { out, sleep, tty, color = false, loops = 1, intro, introSpeed = 1.6, size = () => ({}), signal },
) => {
  if (!tty) {
    for (const motif of intro ? [intro, ...list] : list) {
      out(compose(motif, motif.tiers[0], { color }).join('\n') + '\n\n')
    }
    return
  }
  out(ENTER)
  let layout = ''
  let tone = 0
  const tick = async (ms) => {
    await sleep(ms)
    if (signal?.aborted) throw STOP
  }
  const draw = (motif, shape, opts) => {
    const window = size()
    const art = pickTier(motif, window)
    const lines = compose(motif, shape(art), { ...opts, color, tone: tone++ >> 2, indent: 0 })
    const width = textWidth(art)
    const key = `${window.columns}x${window.rows}:${width}x${lines.length}`
    if (key !== layout) out(CLEAR)
    layout = key
    const top = Math.max(1, Math.floor(((window.rows ?? 40) - lines.length) / 2) + 1)
    const left = Math.max(1, Math.floor(((window.columns ?? 80) - width) / 2) + 1)
    out(lines.map((line, i) => `\x1b[${top + i};${left}H${line}`).join(''))
  }
  const scene = async (motif, { mode, seed, speed = 1, gap = true }) => {
    const reveals = Math.round(REVEAL_STEPS * speed)
    const holds = Math.round(HOLD_FRAMES * speed)
    const dissolves = Math.round(DISSOLVE_STEPS * speed)
    for (let s = 1; s <= reveals; s++) {
      draw(motif, (art) => reveal(art, s / reveals, mode), { captionOn: false })
      await tick(FRAME_MS)
    }
    for (let f = 0; f < holds; f++) {
      draw(motif, (art) => art, {})
      await tick(HOLD_FRAME_MS)
    }
    for (let s = 1; s <= dissolves; s++) {
      draw(motif, (art) => dissolve(art, s / dissolves, seed), { captionOn: s < dissolves / 3 })
      await tick(FRAME_MS)
    }
    if (gap) await tick(GAP_MS)
  }
  try {
    if (intro) await scene(intro, { mode: 'radial', seed: 99, speed: introSpeed, gap: list.length > 0 })
    for (let round = 0; round < loops; round++) {
      for (const [i, motif] of list.entries()) {
        await scene(motif, { mode: i % 2 ? 'radial' : 'diagonal', seed: i + round })
      }
    }
  } catch (error) {
    if (error !== STOP) throw error
  } finally {
    out(LEAVE)
  }
}
