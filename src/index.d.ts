/** Colon-like word separator used on the stones (U+205A). */
export const SEPARATOR: string

/**
 * Latin text (Turkish orthography or scholarly Old Turkic transcription)
 * to Old Turkic script, Orkhon letter forms.
 */
export function transliterate(text: string): string

export interface Quote {
  id: string
  /** e.g. "Kül Tigin inscription", "Kutadgu Bilig" */
  source: string
  /** line or couplet label in the source */
  ref: string
  /** "original" for the Orkhon inscriptions; "stylized" when the source was not written in Old Turkic script */
  script: 'original' | 'stylized'
  /** transcription in simplified Latin spelling */
  text: string
  /** modern Turkish */
  tr: string
  en: string
  note?: string
}

export const quotes: Quote[]

export function randomQuote(random?: () => number): Quote
