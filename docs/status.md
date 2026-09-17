# Status

**Sudah sampai mana, per 8 September 2026.** Diperiksa langsung ke kodenya:
68 berkas, ~12.900 baris, 34 commit.

Yang menjawab "apa saja yang harus dibangun" adalah dokumen lain:
**`docs/rencana-implementasi.md`**. Pemisahan ini disengaja — rencana yang ikut
berubah tiap kali sesuatu selesai berhenti jadi rencana, dan status yang
bercampur rencana berhenti bisa dipercaya.

Dokumen ini sengaja tidak menyenangkan. Yang berguna dari daftar seperti ini
bukan bagian "sudah", melainkan bagian "belum" yang ditulis cukup jujur sampai
bisa dikerjakan.

---

## Ringkasan satu paragraf

Yang sudah jadi adalah **produknya, dijalankan dengan data palsu**: model data
dan penegak aturannya nyata, lima bentuk tata letak nyata, tiga alat nyata,
orchestrator dengan model lokal sungguhan nyata. Yang belum ada adalah
**semua yang menghubungkan satu orang dengan orang lain** — sinkronisasi,
kehadiran, penyimpanan. Suara sungguhan kini ada — Whisper di perangkat sampai
draf yang bisa dijawab dengan suara — kecuali VAD. Ditambah satu lubang yang tidak enak: **belum ada satu pun
uji otomatis untuk `core/`**, padahal bagian 9 menyebut pemulihan siklus sebagai
risiko yang harus benar sejak awal.

---

## 1. Sudah berjalan sungguhan

| Bagian | Catatan |
| ------ | ------- |
| Model data + validator aturan 1–9 | `core/`, tidak mengenal React |
| Pemulihan siklus deterministik | Sebagai proyeksi saat membaca (D10) |
| Lima bentuk tata letak | Tinggi kartu diukur, bukan ditebak (D54) |
| Tiga alat | Voting, retro, matriks (D40, D59) |
| Enam templat | Sebagai kumpulan `createNode`, satu langkah undo (D44) |
| Orchestrator, dua penyedia | Pencocokan aturan + Ollama `qwen2.5:7b` (D48) |
| Set uji orchestrator | 27 kasus termasuk lima berbahasa Inggris, dua penyedia (D62, D69) |
| Pengenalan suara | Whisper base/small, transformers.js di Worker, WebGPU atau WASM (D65) |
| Tahap penyusun struktur | Tambah, daftar, ubah judul, pindah, hapus, hubungkan; aturan + Ollama (D66) |
| Perapi judul | Dijalankan, judul panjang jadi judul pendek + catatan (D67) |
| Perintah diketik | Lewat pemahaman yang sama dengan ucapan (D68) |
| Dua bahasa | Keluaran dan ucapan, Indonesia atau Inggris (D69) |
| Model sebagai orchestrator | Satu panggilan Ollama untuk alat, susun, tanya; aturan jadi rem dan cadangan (D70) |
| Pertanyaan balik | Pilihan bernomor + jawaban bebas lewat suara/ketik, di kursor, dock, dan panel (D71) |
| Undo snapshot + narasi + earcon | Log tetap tambah-saja (D21) |
| Outline ARIA tree sungguhan | Bukan daftar div |
| Telusur audio | Satu nada per simpul, tinggi = kedalaman |
| Palet perintah `Ctrl+K` | 46 entri, disusun dari registry (D56) |
| Enam halaman + dasbor | Bagian 14 terpenuhi |
| Ruang terkunci + ruang tunggu | Ala Zoom, di panel Peserta (D37) |

---

## 2. Belum ada — diurutkan menurut apa yang paling merugikan

### 2.1 Uji otomatis untuk `core/` — **sudah dimulai (D73)**

96 uji, `npm test`: aturan 1, 4, 5, satu pintu data, hitungan suara, alur
suara per perangkat (D74), dokumen Yjs dua perangkat (D75), dan kehadiran (D78). Belum: tata letak, dan orchestrator selain set uji eval.

### 2.2 Isi ruang hilang saat halaman dimuat ulang — **selesai (D75)**

Dokumen kini Yjs, disimpan di IndexedDB, tersinkron antar tab, dan antar
perangkat lewat server satu proses (D76). Catatan lama di
bawah ini dibiarkan sebagai alasan.

Dokumen hidup di memori. Tekan F5, semuanya hilang. Daftar ruang, tema, dan
pilihan penyedia bertahan di `localStorage`; isinya tidak.

Untuk demo ini menakutkan, untuk produk ini mustahil. Perbaikannya sudah ada di
rencana arsitektur: **IndexedDB sebagai salinan lokal**, yang juga langkah
pertama menuju kerja luring.

### 2.3 Suara sungguhan

| Bagian | Status |
| ------ | ------ |
| AudioWorklet | Ada, hanya selama sakelar bicara menyala |
| Silero VAD (ONNX Runtime Web) | Belum |
| ASR lokal (transformers.js WebGPU) | Ada (D65) |
| Kalimat kalengan | Masih tersedia sebagai pilihan "Ucapan contoh" |
| Model disajikan lokal | Belum — unduhan pertama butuh internet, mode kelas belum bisa |

Yang tersisa: VAD, dan menyajikan berkas model dari server sendiri supaya mode
kelas tanpa internet benar-benar jalan. Akurasi Bahasa Indonesia `whisper-base`
belum diukur dengan ucapan manusia; bila kurang, `whisper-small` tinggal dipilih.

### 2.4 Kolaborasi sungguhan

Semua yang menghubungkan satu orang dengan orang lain belum ada:

- ~~**Hocuspocus** — sinkronisasi Yjs~~ — ada, SQLite (D76)
- **Room service** — NestJS sudah berdiri, endpoint ruang dan token belum
- **PostgreSQL** — untuk mode lintas daerah; mode kelas sudah SQLite
- ~~**Kehadiran sungguhan**~~ — lewat Awareness, dengan chip sambungan (D78)
- **Permintaan masuk sungguhan** — ruang tunggu jalan, tapi yang mengetuk palsu

Konsekuensi yang jarang disebut: **belum pernah ada dua orang di satu ruang.**
Semua keputusan soal gabungan bersilangan (D9, D10) benar secara rancangan dan
belum pernah diuji oleh kenyataan.

### 2.5 Aksesibilitas belum diuji dengan pembaca layar sungguhan

Ini yang paling tidak nyaman di seluruh dokumen.

Markup-nya benar: pola ARIA tree, roving tabindex, `aria-activedescendant`,
antrean narasi sendiri, live region. Tapi **belum pernah dijalankan dengan NVDA,
JAWS, atau VoiceOver.** Produk yang klaim intinya aksesibilitas tidak boleh
menganggap ARIA yang ditulis benar sama dengan ARIA yang terdengar benar.

Yang perlu:

1. Satu putaran penuh dengan NVDA di Windows — buat simpul, pindah, voting,
   telusur audio, jawab usulan.
2. Ukur apakah antrean narasi benar-benar menunggu jeda bicara.
3. Uji dengan orang yang memakai pembaca layar setiap hari, bukan dengan kami
   yang baru menyalakannya.

Nomor 3 yang paling menentukan dan paling sering dilewati.

### 2.6 Rasa cepat belum diukur

Bagian 10 menyebut tiga hal yang menentukan rasa cepat. Tidak satu pun diukur:

| Yang dijanjikan | Cara memeriksanya |
| --------------- | ----------------- |
| Tata letak inkremental menahan posisi lama | Ukur pergeseran simpul lama saat satu simpul baru mendarat |
| Penanda kehadiran ~10/detik | Belum ada penanda sungguhan untuk diukur |
| Transkrip mengalir | Sudah, tapi ASR-nya palsu |

Ditambah satu yang belum pernah dilihat: **kanvas dengan 200 simpul.** Data
contoh punya 20. Tata letak, pengukuran tinggi, dan `useSyncExternalStore`
semuanya bisa berperilaku lain di 200.

### 2.7 Hal-hal kecil yang berbohong

- **Kursor agen tidak punya tempat berdiri untuk langkah templat** — belum ada
  simpulnya sebelum mendarat. Lubang D18 yang tersisa.
- **Tawaran alat belum diredam** — ditolak sekali harusnya berarti tidak
  ditawarkan lagi di sesi itu.

### 2.8 Ketahanan

- **Tidak ada error boundary.** Satu galat render membuat layar putih.
- **Tidak ada CI.** `tsc`, `vite build`, dan `npm run eval` dijalankan manual.
- **Tidak ada Dockerfile.** Padahal mode kelas dijanjikan sebagai satu kontainer.
- **Belum diuji di jendela sempit sungguhan** — tata letaknya responsif, tapi
  yang diperiksa selama ini jendela lebar.

---

## 3. Lima langkah berikutnya

Diurutkan menurut **risiko yang dihilangkan per jam kerja**, bukan menurut yang
paling menarik. Rencana lengkapnya di `docs/rencana-implementasi.md`.

1. **Uji `core/`** — pemulihan siklus, indeks pecahan, penolakan, kelengkapan
   narasi. Menghilangkan risiko terbesar yang tersisa, tanpa dependensi baru.
2. **IndexedDB** — muat ulang halaman berhenti menghapus rapat.
3. **Error boundary** — layar putih di depan penilai lebih mahal daripada fitur
   apa pun yang bisa ditambahkan di waktu yang sama.
4. **Satu putaran NVDA** — bahkan satu putaran akan menemukan sesuatu.
5. **Redam tawaran alat** — ditolak sekali berarti tidak ditawarkan lagi di sesi
   itu. ("Perapi judul" sudah dijalankan, D67.)

Pemilik proyek menaruh fitur di atas uji (14 September 2026), jadi urutan ini
dibaca sebagai daftar risiko, bukan antrean kerja.

## 4. Supaya daftar "belum" tidak salah dibaca

Sebagian besar yang belum ada memang **belum waktunya**, bukan tertinggal.
Bagian 14 CLAUDE.md menyatakan tenggat terdekat adalah antarmuka yang bisa
dilihat dan diklik, bukan sistem yang berfungsi penuh — server, sinkronisasi,
dan pengenalan suara memang diganti tombol dan data contoh atas keputusan.

Yang **bukan** keputusan dan memang tertinggal cuma tiga: tidak ada uji untuk
`core/`, muat ulang halaman menghapus isi ruang, dan aksesibilitasnya belum
pernah diuji dengan pembaca layar sungguhan.

Daftar yang sengaja tidak akan pernah dibangun ada di
`docs/rencana-implementasi.md`.
