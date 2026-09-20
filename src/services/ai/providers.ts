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

import { localise } from '../../core/i18n'

export type ProviderId = 'rules' | 'ollama' | 'webllm' | 'vllm' | 'cloud'
export type ProviderStatus = 'active' | 'planned'

export interface ModelProvider {
  id: ProviderId
  name: string
  detail: string
  /** Where the words go. This is the sentence that decides everything else. */
  dataPath: string
  /**
   * Whether the words stay on the device.
   *
   * A flag, not a test on the sentence: the list used to decide how to draw
   * this row by checking whether `dataPath` began with "Tidak", which is the
   * kind of thing that works until somebody switches to English and every
   * provider suddenly looks like it ships text off the machine.
   */
  staysLocal: boolean
  status: ProviderStatus
  /** Shown when picking it would change the promise in the top bar. */
  warning?: string
}

export const PROVIDERS: ModelProvider[] = [
  {
    id: 'rules',
    name: 'Pencocokan aturan',
    detail: 'Cadangan. Hanya paham kalimat berpola tetap.',
    dataPath: 'Tidak ada yang keluar dari perangkat.',
    staysLocal: true,
    status: 'active',
  },
  {
    id: 'ollama',
    name: 'Ollama di perangkat',
    detail: 'Bawaan. Paham maksud ucapan, bertanya kalau ragu.',
    dataPath: 'Tidak ada yang keluar dari perangkat.',
    staysLocal: true,
    status: 'active',
  },
  {
    id: 'webllm',
    name: 'WebLLM di peramban',
    detail: 'Tanpa memasang apa pun. Butuh WebGPU.',
    dataPath: 'Tidak ada yang keluar dari perangkat.',
    staysLocal: true,
    status: 'planned',
  },
  {
    id: 'vllm',
    name: 'vLLM di server institusi',
    detail: 'Satu server untuk satu kampus atau satu sekolah.',
    dataPath: 'Teks keluar dari perangkat, tetapi tidak keluar dari jaringan institusi.',
    staysLocal: false,
    status: 'planned',
  },
  {
    id: 'cloud',
    name: 'Layanan awan',
    detail: 'Model besar, hasil lebih rapi, ada biaya per pemakaian.',
    dataPath: 'Teks keluar ke server pihak ketiga. Audio tetap tidak pernah dikirim.',
    staysLocal: false,
    status: 'planned',
    warning:
      'Harus dinyalakan secara sadar, tidak pernah menjadi cadangan otomatis, dan lencana di bilah atas berubah selama aktif.',
  },
]

/*
  The English half. Written as one block per provider so a new provider cannot
  be added with only half its sentences -- the record below is keyed by id, and
  the compiler asks for all three.
*/
const EN: Record<ProviderId, { name: string; detail: string; dataPath: string; warning?: string }> = {
  rules: {
    name: 'Rule matching',
    detail: 'The fallback. Understands fixed sentence patterns only.',
    dataPath: 'Nothing leaves this device.',
  },
  ollama: {
    name: 'Ollama on this device',
    detail: 'The default. Understands what was meant, and asks when unsure.',
    dataPath: 'Nothing leaves this device.',
  },
  webllm: {
    name: 'WebLLM in the browser',
    detail: 'Nothing to install. Needs WebGPU.',
    dataPath: 'Nothing leaves this device.',
  },
  vllm: {
    name: 'vLLM on an institution server',
    detail: 'One server for one campus or one school.',
    dataPath: 'Text leaves the device, but not the institution network.',
  },
  cloud: {
    name: 'A cloud service',
    detail: 'A big model, tidier results, a cost per use.',
    dataPath: 'Text goes to a third-party server. Audio is still never sent.',
    warning:
      'It must be switched on deliberately, is never an automatic fallback, and the badge in the top bar changes while it is on.',
  },
}

for (const provider of PROVIDERS) {
  const en = EN[provider.id]
  localise(provider, 'name', en.name)
  localise(provider, 'detail', en.detail)
  localise(provider, 'dataPath', en.dataPath)
  if (provider.warning && en.warning) localise(provider, 'warning', en.warning)
}

/** Selectable today. The rest are shown disabled on purpose -- see the header. */
export const SELECTABLE: ProviderId[] = ['rules', 'ollama']
