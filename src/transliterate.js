// Latin (Turkish orthography or scholarly Old Turkic transcription) -> Old Turkic script.
// Output uses the Orkhon letter forms of the Unicode "Old Turkic" block (U+10C00-10C4F).
//
// Spelling conventions followed (as on the Orkhon stones):
//  - a/e are written only at the end of a word (or next to another vowel)
//  - of ı i o u ö ü only the first one in a word is written, plus a final one; the rest are left out (bodun -> b o d n, kılıntu- -> k ı l n t)
//  - a/e share one letter, o/u share one, ö/ü share one, ı/i share one
//  - b d g k l n r s t y have a back-vowel and a front-vowel letter; the nearest vowel decides
//  - syllable signs and ligatures (oq, ök, nt, lt, ...) are never emitted
export const SEPARATOR = '⁚'

const glyph = (code) => String.fromCodePoint(code)

const A = glyph(0x10c00)
const I = glyph(0x10c03)
const O = glyph(0x10c06)
const OE = glyph(0x10c07)

const vowel = (written, front, keptInFirstSyllable) => ({ vowel: true, written, front, keptInFirstSyllable })
const pair = (back, front) => ({ back: glyph(back), front: glyph(front) })
const single = (code) => ({ back: glyph(code), front: glyph(code) })

const LETTERS = {
  a: vowel(A, false, false),
  e: vowel(A, true, false),
  ä: vowel(A, true, false),
  ı: vowel(I, false, true),
  ï: vowel(I, false, true),
  i: vowel(I, true, true),
  o: vowel(O, false, true),
  u: vowel(O, false, true),
  ö: vowel(OE, true, true),
  ü: vowel(OE, true, true),

  b: pair(0x10c09, 0x10c0b),
  v: pair(0x10c09, 0x10c0b),
  d: pair(0x10c11, 0x10c13),
  g: pair(0x10c0d, 0x10c0f),
  ğ: pair(0x10c0d, 0x10c0f),
  γ: pair(0x10c0d, 0x10c0f),
  y: pair(0x10c16, 0x10c18),
  k: pair(0x10c34, 0x10c1a),
  q: pair(0x10c34, 0x10c1a),
  h: pair(0x10c34, 0x10c1a),
  l: pair(0x10c1e, 0x10c20),
  n: pair(0x10c23, 0x10c24),
  r: pair(0x10c3a, 0x10c3c),
  s: pair(0x10c3d, 0x10c3e),
  t: pair(0x10c43, 0x10c45),

  z: single(0x10c14),
  m: single(0x10c22),
  p: single(0x10c2f),
  f: single(0x10c2f),
  ŋ: single(0x10c2d),
  ñ: single(0x10c2d),
  ç: single(0x10c32),
  c: single(0x10c32),
  č: single(0x10c32),
  ş: single(0x10c41),
  š: single(0x10c41),
}

const toItems = (word) =>
  [...word.replaceAll('ng', 'ŋ')].map((ch) => ({ ch, ...(LETTERS[ch] ?? { raw: true }) }))

// A consonant takes the harmony of the nearest vowel: before it, else after it.
const frontAt = (items, i) => {
  for (let j = i - 1; j >= 0; j--) if (items[j].vowel) return items[j].front
  for (let j = i + 1; j < items.length; j++) if (items[j].vowel) return items[j].front
  return false
}

const spellWord = (word) => {
  const items = toItems(word)
  let vowelsSeen = 0
  return items
    .map((item, i) => {
      if (item.raw) return item.ch
      if (!item.vowel) return frontAt(items, i) ? item.front : item.back
      const final = items[i + 1] === undefined || items[i + 1].raw
      const afterVowel = items[i - 1]?.vowel === true
      const firstSyllable = item.keptInFirstSyllable && vowelsSeen++ === 0
      return final || afterVowel || firstSyllable ? item.written : ''
    })
    .join('')
}

const spellLine = (line) =>
  line
    .split(/\s+/u)
    .filter(Boolean)
    .map((token) => {
      const [, lead, word, tail] = token.match(/^([^\p{L}]*)(.*?)([^\p{L}]*)$/u)
      return lead + spellWord(word) + tail
    })
    .join(SEPARATOR)

export const transliterate = (text) =>
  text
    .toLocaleLowerCase('tr')
    .normalize('NFC')
    .split('\n')
    .map(spellLine)
    .join('\n')
