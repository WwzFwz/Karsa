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
  /**
   * The sync server. A path means "the server this page came from", which is
   * right for the one-container install and for Vite's dev proxy alike.
   * `off` keeps every room on this device only.
   */
  syncUrl: text('VITE_SYNC_URL', '/sync'),
  /** The room service. A path means the server this page came from. */
  apiUrl: text('VITE_API_URL', '/api'),
  /**
   * Where the speech model files are fetched from.
   *
   * Empty means the Hugging Face CDN, which is right for a laptop with
   * internet and wrong for the promise in section 7. Mode kelas is "one
   * container on the teacher's laptop, local network, no internet at all", and
   * a first sentence that needs an 80 MB download from the other side of the
   * world is not that. Point this at the server the page came from and the
   * room works on a network with no way out.
   */
  modelUrl: text('VITE_MODEL_URL', ''),
} as const

/**
 * Where speech model files come from, without a trailing slash, or null for
 * the public CDN. A path is resolved against the page, so `/models` means the
 * server that served the app -- the same reasoning as `syncUrl`.
 */
export function modelUrl(): string | null {
  const value = CONFIG.modelUrl.trim()
  if (!value) return null
  const trimmed = value.endsWith('/') ? value.slice(0, -1) : value
  if (/^https?:/i.test(trimmed)) return trimmed
  const origin = (globalThis as unknown as { location?: { origin?: string } }).location?.origin
  return origin ? `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}` : trimmed
}

/** Where room service calls go, without a trailing slash. */
export function apiUrl(): string {
  const value = CONFIG.apiUrl
  return value.endsWith('/') ? value.slice(0, -1) : value
}

/** The WebSocket address of the sync server, or null when sync is off. */
export function syncUrl(): string | null {
  const value = CONFIG.syncUrl
  if (value === 'off') return null
  if (value.startsWith('ws://') || value.startsWith('wss://')) return value
  const here = globalThis.location
  if (!here) return null
  return `${here.protocol === 'https:' ? 'wss' : 'ws'}://${here.host}${value.startsWith('/') ? '' : '/'}${value}`
}

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
