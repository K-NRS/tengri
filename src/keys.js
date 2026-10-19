/**
 * Keyboard input as a queue, so the quote browser and the screensaver can
 * take turns on one stream without losing or double-reading a key.
 * Works as an async iterable (for the browser) and with `read` (one key,
 * cancellable, for the screensaver).
 */
export const createKeys = (stream) => {
  const queue = []
  const waiting = []
  const onData = (chunk) => {
    const key = String(chunk)
    const waiter = waiting.shift()
    if (waiter) waiter(key)
    else queue.push(key)
  }
  stream.on('data', onData)

  const close = () => {
    stream.off('data', onData)
    for (const waiter of waiting.splice(0)) waiter(null)
  }

  /** The next key, or null if `signal` aborts or the reader closes first. */
  const read = (signal) =>
    new Promise((resolve) => {
      if (queue.length) return resolve(queue.shift())
      if (signal?.aborted) return resolve(null)
      const waiter = (key) => {
        signal?.removeEventListener('abort', onAbort)
        resolve(key)
      }
      const onAbort = () => {
        const at = waiting.indexOf(waiter)
        if (at >= 0) waiting.splice(at, 1)
        resolve(null)
      }
      signal?.addEventListener('abort', onAbort, { once: true })
      waiting.push(waiter)
    })

  return {
    read,
    close,
    [Symbol.asyncIterator]() {
      return {
        next: async () => {
          const key = await read()
          return key === null ? { done: true, value: undefined } : { done: false, value: key }
        },
        return: async () => ({ done: true, value: undefined }),
      }
    },
  }
}
