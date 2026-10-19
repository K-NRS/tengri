export const GOLD = '1;38;5;179'
export const FAINT = '2'
export const ITALIC_FAINT = '2;3'
export const BORDER = '38;5;137'
export const WHISPER = '2;38;5;242'

export const paint = (code, enabled) => (text) => (enabled ? `\x1b[${code}m${text}\x1b[0m` : text)

export const CLEAR_LINE = '\x1b[2K'
export const up = (n) => `\x1b[${n}A\r`
