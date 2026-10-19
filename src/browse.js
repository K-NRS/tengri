import { formatQuote, MIN_WIDTH } from './format.js'
import { WHISPER, CLEAR_LINE, paint, up } from './style.js'

const HIDE = '\x1b[?25l'
const SHOW = '\x1b[?25h'
const HINT = 'space · →  next     ←  back     t  tamga     q  quit'

const KEYS = new Map([
  [' ', 'next'],
  ['\r', 'next'],
  ['\x1b[C', 'next'],
  ['\x1b[B', 'next'],
  ['\x1b[D', 'prev'],
  ['\x1b[A', 'prev'],
  ['t', 'tamga'],
  ['T', 'tamga'],
  ['q', 'quit'],
  ['Q', 'quit'],
  ['\x03', 'quit'],
  ['\x1b', 'quit'],
])

/** What a chunk of keyboard input means: 'next', 'prev', 'tamga', 'quit', or null. */
export const keyAction = (chunk) => KEYS.get(chunk) ?? null

const shuffle = (list, random) => {
  const deck = [...list]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

/**
 * Shows one quote at a time in place: space, enter or → for the next one,
 * ← for the one before, t for the tamga screensaver, q to quit. `keys` is an
 * async iterable of input chunks; `onTamga` runs the screensaver and resolves
 * to the key that stopped it (q or Ctrl-C then quit, any other key comes back
 * here). The last quote stays on screen, without the hint.
 */
export const browse = async (list, { out, keys, size = () => ({}), color = false, random = Math.random, onTamga }) => {
  const deck = shuffle(list, random)
  let at = 0
  let height = 0
  const draw = ({ hint }) => {
    const width = Math.max(MIN_WIDTH, Math.min((size().columns ?? 80) - 8, 68))
    const lines = ['', ...formatQuote(deck[at], { color, width }).split('\n'), '']
    if (hint) lines.push(`  ${paint(WHISPER, color)(HINT)}`, '')
    let text = (height ? up(height) : '') + lines.map((line) => CLEAR_LINE + line).join('\n') + '\n'
    if (lines.length < height) {
      const extra = height - lines.length
      text += (CLEAR_LINE + '\n').repeat(extra) + up(extra)
    }
    out(text)
    height = lines.length
  }
  out(HIDE)
  try {
    draw({ hint: true })
    for await (const chunk of keys) {
      const action = keyAction(String(chunk))
      if (action === 'quit') break
      if (!action) continue
      if (action === 'tamga') {
        if (!onTamga) continue
        const stoppedBy = await onTamga()
        if (stoppedBy && keyAction(stoppedBy) === 'quit') break
        draw({ hint: true })
        continue
      }
      at = (at + (action === 'next' ? 1 : deck.length - 1)) % deck.length
      draw({ hint: true })
    }
  } finally {
    draw({ hint: false })
    out(SHOW)
  }
}
