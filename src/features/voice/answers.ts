/**
 * Reading a spoken or typed answer to something the assistant is showing.
 *
 * Pure functions, no microphone: the same answer can arrive by voice or by
 * keyboard (D68), so it must be read the same way either time.
 */

/*
  Voice answers to a standing proposal (D4c). Short and deliberately narrow:
  anything that is not clearly yes or no is read as a new instruction instead,
  because applying on a misheard "ya" is the one mistake that lands on everyone.
*/
const YES = /^(ya|iya|oke|ok|okay|setuju|terapkan|lanjut|boleh|betul|benar|siap|yes|yeah|yep|sure|apply|go ahead|do it|correct)\b/
const NO = /^(tidak|nggak|enggak|gak|jangan|batal|batalkan|buang|tolak|bukan|no|nope|cancel|discard|dont|stop)\b/

/**
 * Which option an answer names, or null. Numbers first ("yang kedua", "nomor
 * 2", "the second one"), then an option whose words were said -- but only when
 * exactly one option is clearly the best match, because picking the wrong
 * option on a shared canvas is the guess section 8 forbids.
 */
const ORDINALS: [RegExp, number][] = [
  [/\b(1|satu|pertama|kesatu|first|one)\b/, 0],
  [/\b(2|dua|kedua|second|two)\b/, 1],
  [/\b(3|tiga|ketiga|third|three)\b/, 2],
  [/\b(4|empat|keempat|fourth|four)\b/, 3],
]

export function pickChoice(transcript: string, choices: { id: string; label: string }[]): string | null {
  if (choices.length === 0) return null
  const text = transcript.toLowerCase().replace(/[.,!?"]/g, ' ').replace(/\s+/g, ' ').trim()
  // A short answer with a number in it is a number answer.
  if (text.split(' ').length <= 5) {
    for (const [pattern, index] of ORDINALS) {
      if (pattern.test(text) && choices[index]) return choices[index].id
    }
  }
  const said = new Set(text.split(' ').filter((w) => w.length >= 4))
  const scores = choices.map((c) => {
    const words = c.label.toLowerCase().replace(/[.,!?"]/g, ' ').split(/\s+/).filter((w) => w.length >= 4)
    const hits = words.filter((w) => said.has(w)).length
    return words.length ? hits / words.length : 0
  })
  const best = Math.max(...scores)
  const winners = scores.filter((s) => s === best).length
  return best >= 0.5 && winners === 1 ? choices[scores.indexOf(best)].id : null
}

export function readAnswer(transcript: string): 'yes' | 'no' | null {
  const text = transcript.toLowerCase().replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim()
  if (text.split(' ').length > 5) return null
  if (NO.test(text)) return 'no'
  if (YES.test(text)) return 'yes'
  return null
}
