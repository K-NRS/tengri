import { test } from 'node:test'
import assert from 'node:assert/strict'
import { transliterate, SEPARATOR } from '../src/index.js'

const cp = (...codes) => String.fromCodePoint(...codes)

test('tengri: t² ŋ r² i (golden, from the Old Turkic script reference sample)', () => {
  assert.equal(transliterate('tengri'), '𐱅𐰭𐰼𐰃')
  assert.equal(transliterate('tengri'), cp(0x10c45, 0x10c2d, 0x10c3c, 0x10c03))
})

test('Turkish casing: TENGRİ and TENGRI read the same word', () => {
  assert.equal(transliterate('TENGRİ'), transliterate('tengri'))
  assert.equal(transliterate('TENGRI'), transliterate('tengri'))
})

test('Turkish casing: IRK is ırk (dotless ı, back harmony)', () => {
  assert.equal(transliterate('IRK'), transliterate('ırk'))
  assert.equal(transliterate('ırk'), cp(0x10c03, 0x10c3a, 0x10c34))
})

test('kök türk: front consonants, written ö/ü', () => {
  assert.equal(transliterate('kök türk'), '𐰚𐰇𐰚' + SEPARATOR + '𐱅𐰇𐰼𐰚')
})

test('bilge: first-syllable i written, final e written', () => {
  assert.equal(transliterate('bilge'), cp(0x10c0b, 0x10c03, 0x10c20, 0x10c0f, 0x10c00))
})

test('kağan: back k, ğ as g, medial a dropped', () => {
  assert.equal(transliterate('kağan'), cp(0x10c34, 0x10c0d, 0x10c23))
})

test('kişi: first-syllable and final i written', () => {
  assert.equal(transliterate('kişi'), cp(0x10c1a, 0x10c03, 0x10c41, 0x10c03))
})

test('initial a/e is left out, final a/e is written', () => {
  assert.equal(transliterate('ata'), cp(0x10c43, 0x10c00))
  assert.equal(transliterate('el'), cp(0x10c20))
})

test('initial ı/i/o/u is written', () => {
  assert.equal(transliterate('ok'), cp(0x10c06, 0x10c34))
  assert.equal(transliterate('olurtum'), cp(0x10c06, 0x10c1e, 0x10c3a, 0x10c43, 0x10c22))
})

// Spellings attested on the stones (checked against the Old Turkic text of the
// Kül Tigin inscription as transcribed on Turkish Wikisource).
test('attested spellings: asra, ekin, bodun', () => {
  assert.equal(transliterate('asra'), cp(0x10c3d, 0x10c3a, 0x10c00))
  assert.equal(transliterate('ekin'), cp(0x10c1a, 0x10c03, 0x10c24))
  assert.equal(transliterate('bodun'), cp(0x10c09, 0x10c06, 0x10c11, 0x10c23))
})

test('words are joined by the colon-like separator, as on the stones', () => {
  assert.equal(SEPARATOR, '⁚')
  assert.equal(transliterate('tengri  tengri'), '𐱅𐰭𐰼𐰃' + SEPARATOR + '𐱅𐰭𐰼𐰃')
})

test('scholarly transcription letters work too (ä ï ŋ š γ q)', () => {
  assert.equal(transliterate('täŋri'), transliterate('tengri'))
  assert.equal(transliterate('qaγan'), transliterate('kağan'))
})

test('characters without a counterpart pass through untouched', () => {
  assert.equal(transliterate('tengri, 732'), '𐱅𐰭𐰼𐰃,' + SEPARATOR + '732')
  assert.equal(transliterate(''), '')
})
