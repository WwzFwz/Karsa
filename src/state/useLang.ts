/**
 * Re-renders a component when the output language changes.
 *
 * The only React part of the language module. Kept out of core so the rules
 * and sentences stay runnable in node, where `npm test` and `npm run eval` live.
 */

import { useSyncExternalStore } from 'react'
import { lang, subscribeLang, type Lang } from '../core/i18n'

export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, lang, lang)
}
