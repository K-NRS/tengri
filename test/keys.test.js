import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createKeys } from '../src/keys.js'

const stream = () => new EventEmitter()

test('keys pressed before anyone reads are kept, in order', async () => {
  const input = stream()
  const keys = createKeys(input)
  input.emit('data', Buffer.from('a'))
  input.emit('data', 'b')
  assert.equal(await keys.read(), 'a')
  assert.equal(await keys.read(), 'b')
})

test('a waiting read gets the next key', async () => {
  const input = stream()
  const keys = createKeys(input)
  const pending = keys.read()
  input.emit('data', ' ')
  assert.equal(await pending, ' ')
})

test('an aborted read gives null and does not swallow the next key', async () => {
  const input = stream()
  const keys = createKeys(input)
  const controller = new AbortController()
  const cancelled = keys.read(controller.signal)
  controller.abort()
  assert.equal(await cancelled, null)
  input.emit('data', 'x')
  assert.equal(await keys.read(), 'x', 'the key is still there for the next reader')
})

test('an already aborted signal reads null, unless a key is waiting', async () => {
  const input = stream()
  const keys = createKeys(input)
  const controller = new AbortController()
  controller.abort()
  assert.equal(await keys.read(controller.signal), null)
  input.emit('data', 'k')
  assert.equal(await keys.read(controller.signal), 'k')
})

test('as an async iterable it yields keys and ends when closed', async () => {
  const input = stream()
  const keys = createKeys(input)
  const seen = []
  const consumer = (async () => {
    for await (const key of keys) seen.push(key)
  })()
  input.emit('data', 'a')
  input.emit('data', 'b')
  await new Promise((resolve) => setImmediate(resolve))
  keys.close()
  await consumer
  assert.deepEqual(seen, ['a', 'b'])
  assert.equal(input.listenerCount('data'), 0, 'the stream listener is removed')
})

test('leaving a for-await loop early keeps the reader usable', async () => {
  const input = stream()
  const keys = createKeys(input)
  input.emit('data', 'a')
  input.emit('data', 'b')
  for await (const key of keys) {
    assert.equal(key, 'a')
    break
  }
  assert.equal(await keys.read(), 'b')
})
