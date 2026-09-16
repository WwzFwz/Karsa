/**
 * Every value that changes between one installation and the next, in one place.
 *
 * Two layers, on purpose:
 *
 * 1. **Build time** (`.env`, `VITE_*`). What an institution sets once when they
 *    build or deploy their own copy.
 * 2. **Run time** (this device, `localStorage`). What one person changes from
 *    Settings without rebuilding anything -- pointing the app at the Ollama on
 *    their own machine is exactly that.
 *
 * Run time wins over build time, and build time wins over the defaults here.
 * The defaults are what mode kelas needs: a model on this very machine.
 *
 * Kept free of imports so it can be read from the app, from the worker, and
 * from the node bundle that `npm run eval` builds.
 */

type EnvBag = Record<string, string | undefined>

function envBag(): EnvBag {
  // Vite injects import.meta.env. The eval bundle runs in node, where it is
  // absent and process.env is the equivalent.
  const meta = (import.meta as unknown as { env?: EnvBag }).env
  if (meta) return meta
  const proc = (globalThis as unknown as { process?: { env?: EnvBag } }).process
  return proc?.env ?? {}
}

const env = envBag()
const text = (name: string, fallback: string): string => {
  const value = env[name]
  return value && value.trim() ? value.trim() : fallback
}

export const CONFIG = {
  /** Where the local model answers. Overridable per device (see below). */
  ollamaUrl: text('VITE_OLLAMA_URL', 'http://localhost:11434'),
  ollamaModel: text('VITE_OLLAMA_MODEL', 'qwen2.5:7b'),
  /** Speech recognition model, downloaded once and cached by the browser. */
  asrModel: text('VITE_ASR_MODEL', 'onnx-community/whisper-base'),
  asrModelAccurate: text('VITE_ASR_MODEL_ACCURATE', 'onnx-community/whisper-small'),
} as const

const URL_KEY = 'karsa:ollama-url'
const MODEL_KEY = 'karsa:ollama-model'

function stored(key: string): string | null {
  try {
    const value = localStorage.getItem(key)
    return value && value.trim() ? value.trim() : null
  } catch {
    // No storage (node, or a locked-down browser). Build-time value stands.
    return null
  }
}

/**
 * The address this device talks to. A deployed copy is served from a server
 * while the model stays on the listener's own machine, so this has to be
 * changeable without a rebuild.
 */
export function ollamaUrl(): string {
  return (stored(URL_KEY) ?? CONFIG.ollamaUrl).replace(/\/+$/, '')
}

export function ollamaModel(): string {
  return stored(MODEL_KEY) ?? CONFIG.ollamaModel
}

export function setOllamaUrl(value: string): void {
  try {
    const trimmed = value.trim()
    if (trimmed) localStorage.setItem(URL_KEY, trimmed)
    else localStorage.removeItem(URL_KEY)
  } catch {
    // Not remembered; still used for this session by the caller's own state.
  }
}

export function setOllamaModel(value: string): void {
  try {
    const trimmed = value.trim()
    if (trimmed) localStorage.setItem(MODEL_KEY, trimmed)
    else localStorage.removeItem(MODEL_KEY)
  } catch {
    // Same as above.
  }
}

/** True when the page is https and the model endpoint is plain http. */
export function isMixedContent(url: string): boolean {
  try {
    return globalThis.location?.protocol === 'https:' && url.startsWith('http://')
  } catch {
    return false
  }
}
