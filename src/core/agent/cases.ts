/**
 * What the orchestrator is supposed to decide, written down.
 *
 * Prompt tuning without this is guesswork: you change a sentence, the one case
 * you happened to try gets better, and you never find out which three got
 * worse. A 7B model is exactly the size where that happens quietly.
 *
 * The list leans on the cases that are easy to get wrong rather than the ones
 * that are easy to pass:
 *
 *   - **Negatives.** Most of a meeting is ordinary content. A router that
 *     reaches for a template whenever it sees the word "prioritas" is worse
 *     than one that never reaches at all, because it interrupts.
 *   - **Ambiguity.** Two templates in one sentence must produce a question.
 *     Section 8 does not bend here: nothing is guessed on a shared canvas.
 *   - **Deictic speech.** "Yang ini pindahkan ke sini" is how people actually
 *     talk, and it is content, not a tool request.
 *
 * `intent` is what must happen. `template` is checked only when one is
 * expected, because which template is a softer claim than whether any.
 */

import type { Intent } from './types'

export interface EvalCase {
  transcript: string
  intent: Intent
  /** Only meaningful when the expected intent asks for a tool. */
  template?: string
  /** Why this case is in the list. Read when it fails. */
  why: string
}

export const CASES: EvalCase[] = [
  // --- named outright: the cheap certain route ---
  {
    transcript: 'bikin voting buat memilih prioritas semester ini',
    intent: 'alat-diminta',
    template: 'voting',
    why: 'Menyebut alatnya. Tidak boleh ada yang ditebak.',
  },
  {
    transcript: 'tolong buka papan retro untuk sprint kemarin',
    intent: 'alat-diminta',
    template: 'retro',
    why: 'Menyebut retro, meski dengan kata kerja lain.',
  },
  {
    transcript: 'kita pakai matriks dampak usaha ya',
    intent: 'alat-diminta',
    template: 'matriks',
    why: 'Nama alat lengkap.',
  },
  {
    transcript: 'siapkan lima kenapa untuk masalah ini',
    intent: 'alat-diminta',
    template: 'lima_kenapa',
    why: 'Nama alat dua kata yang gampang tertukar dengan angka biasa.',
  },
  {
    transcript: 'buat tempat parkir dulu buat pertanyaan yang belum kejawab',
    intent: 'alat-diminta',
    template: 'parkir',
    why: 'Nama alat yang juga kata sehari-hari.',
  },
  {
    transcript: 'bikin rencana sprint',
    intent: 'alat-diminta',
    template: 'sprint',
    why: 'Permintaan paling pendek yang masih menyebut nama.',
  },

  // --- implied: allowed, but only as a suggestion ---
  {
    transcript: 'kenapa bisa tingkat putus mata kuliah setinggi itu',
    intent: 'alat-diusulkan',
    template: 'lima_kenapa',
    why: 'Menelusuri sebab tanpa menyebut alatnya.',
  },
  {
    transcript: 'kita harus putuskan mana yang duluan dikerjakan',
    intent: 'alat-diusulkan',
    why: 'Minta keputusan bersama. Voting atau matriks sama-sama masuk akal.',
  },
  {
    transcript: 'apa yang jalan dan apa yang tidak jalan sprint ini',
    intent: 'alat-diusulkan',
    template: 'retro',
    why: 'Mengevaluasi cara kerja, bentuk kalimat retro yang klasik.',
  },

  // --- must ask, never choose ---
  {
    transcript: 'kita bikin retro sekalian voting ya',
    intent: 'ambigu',
    why: 'Dua alat dalam satu kalimat. Bagian 8: tidak menebak di kanvas bersama.',
  },
  {
    transcript: 'matriks atau voting enaknya yang mana',
    intent: 'ambigu',
    why: 'Pengguna sendiri yang belum memutuskan; menjawabnya berarti memilihkan.',
  },

  // --- ordinary content: the majority, and the easiest to get wrong ---
  {
    transcript: 'tambahkan gagasan pelatihan dosen di bawah rancangan mata kuliah',
    intent: 'susun',
    why: 'Perintah menambah yang eksplisit.',
  },
  {
    transcript: 'buat tiga langkah siapkan ruang lalu pasang perangkat lunak lalu uji jaringan',
    intent: 'susun',
    why: 'Beberapa simpul sekaligus, tetap isi biasa.',
  },
  {
    transcript: 'ubah judul anggaran lab jadi anggaran laboratorium belum pasti',
    intent: 'susun',
    why: 'Mengganti nama, bukan meminta alat.',
  },
  {
    transcript: 'yang ini kita pindahkan ke sini saja ya',
    intent: 'susun',
    why: 'Kalimat tunjuk. Begini cara orang benar-benar bicara di rapat.',
  },
  {
    transcript: 'uji coba satu kelas bergantung pada anggaran laboratorium',
    intent: 'susun',
    why: 'Menyatakan hubungan antar simpul.',
  },
  {
    transcript: 'tandai kirim draf ke ketua program studi sudah selesai',
    intent: 'susun',
    why: 'Mengubah status.',
  },
  {
    transcript: 'prioritas kita semester ini adalah aksesibilitas',
    intent: 'susun',
    why: 'Memuat kata "prioritas" tapi cuma menyatakan fakta. Perangkap paling gampang.',
  },
  {
    transcript: 'suara mahasiswa di survei kemarin cukup jelas',
    intent: 'susun',
    why: 'Memuat kata "suara" dalam arti yang sama sekali lain.',
  },
  {
    transcript: 'catat bahwa retro kemarin sudah kita bahas dan hasilnya sudah ditindaklanjuti',
    intent: 'susun',
    why: 'Menyebut retro sebagai peristiwa lampau, bukan meminta papannya.',
  },
  {
    transcript: 'dampak dari kebijakan ini besar sekali buat mahasiswa tingkat akhir',
    intent: 'susun',
    why: 'Memuat "dampak" tanpa membandingkannya dengan usaha.',
  },
  {
    transcript: 'tolong hapus simpul tambah praktikum aksesibilitas',
    intent: 'susun',
    why: 'Menghapus. Harus lewat penyusun, bukan pemilih alat.',
  },
]
