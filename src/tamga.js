import { play } from './animate.js'

const realSleep = (ms, signal) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => (clearTimeout(timer), resolve()), { once: true })
  })

/**
 * Runs the screensaver until a key is pressed (`read` supplies it) or
 * `signal` aborts. Resolves to the key that stopped it, or null. Without a
 * TTY nothing is read: every motif is printed once.
 */
export const runTamga = async ({ list, intro, introSpeed, out, read, size, color, tty, signal, sleep }) => {
  const stopper = new AbortController()
  let stoppedBy = null
  const stop = (key) => {
    stoppedBy ??= key
    stopper.abort()
  }
  signal?.addEventListener('abort', () => stop('\x03'), { once: true })
  if (tty) read(stopper.signal).then((key) => key !== null && stop(key))
  await play(list, {
    out,
    sleep: sleep ?? ((ms) => realSleep(ms, stopper.signal)),
    tty,
    color,
    loops: tty && list.length > 0 ? Infinity : 1,
    intro,
    introSpeed,
    size,
    signal: stopper.signal,
  })
  stopper.abort() // releases a read that is still waiting
  return stoppedBy
}
