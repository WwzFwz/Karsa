/**
 * Which model runs the pipeline, and which ones are not built yet.
 *
 * One interface, several providers. Ollama on the device is the default and
 * the only one wired up; the rest are shown but disabled, because a settings
 * screen that hides its unfinished options teaches the wrong shape of the
 * product. A person should be able to see that a cloud option exists, and that
 * turning it on would change what the interface promises.
 *
 * The cloud provider is never an automatic fallback. If the local model is
 * missing, the answer is "the local model is missing", not a quiet round trip
 * to somebody's server.
 */

export type ProviderId = 'rules' | 'ollama' | 'webllm' | 'vllm' | 'cloud'
export type ProviderStatus = 'active' | 'planned'

export interface ModelProvider {
  id: ProviderId
  name: string
  detail: string
  /** Where the words go. This is the sentence that decides everything else. */
  dataPath: string
  status: ProviderStatus
  /** Shown when picking it would change the promise in the top bar. */
  warning?: string
}

export const PROVIDERS: ModelProvider[] = [
  {
    id: 'rules',
    name: 'Pencocokan aturan',
    detail:
      'Tanpa model sama sekali. Cepat, deterministik, dan jalan di kelas yang tidak punya jaringan maupun Ollama.',
    dataPath: 'Tidak ada yang keluar dari perangkat.',
    status: 'active',
  },
  {
    id: 'ollama',
    name: 'Ollama di perangkat',
    detail: 'Model kecil berjalan di mesin ini, dengan constrained decoding berskema JSON.',
    dataPath: 'Tidak ada yang keluar dari perangkat.',
    status: 'active',
  },
  {
    id: 'webllm',
    name: 'WebLLM di peramban',
    detail: 'Tanpa memasang apa pun. Butuh WebGPU, dan lebih lambat daripada Ollama.',
    dataPath: 'Tidak ada yang keluar dari perangkat.',
    status: 'planned',
  },
  {
    id: 'vllm',
    name: 'vLLM di server institusi',
    detail: 'Satu server untuk satu kampus atau satu sekolah.',
    dataPath: 'Teks keluar dari perangkat, tetapi tidak keluar dari jaringan institusi.',
    status: 'planned',
  },
  {
    id: 'cloud',
    name: 'Layanan awan',
    detail: 'Model besar, hasil lebih rapi, ada biaya per pemakaian.',
    dataPath: 'Teks keluar ke server pihak ketiga. Audio tetap tidak pernah dikirim.',
    status: 'planned',
    warning:
      'Harus dinyalakan secara sadar, tidak pernah menjadi cadangan otomatis, dan lencana di bilah atas berubah selama aktif.',
  },
]

/** Selectable today. The rest are shown disabled on purpose -- see the header. */
export const SELECTABLE: ProviderId[] = ['rules', 'ollama']
