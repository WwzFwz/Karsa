# Status

**Sudah sampai mana, per 18 September 2026.** Diperiksa langsung ke kodenya,
bukan diingat dari rencana.

Yang menjawab "apa saja yang harus dibangun" adalah dokumen lain:
**`docs/rencana-implementasi.md`**. Pemisahan ini disengaja — rencana yang ikut
berubah tiap kali sesuatu selesai berhenti jadi rencana, dan status yang
bercampur rencana berhenti bisa dipercaya.

Dokumen ini sengaja tidak menyenangkan. Yang berguna dari daftar seperti ini
bukan bagian "sudah", melainkan bagian "belum" yang ditulis cukup jujur sampai
bisa dikerjakan.

---

## Ringkasan satu paragraf

Produknya jalan sungguhan sekarang, bukan dengan data palsu: dokumen Yjs di
server, kehadiran lewat Awareness, token dan ruang tunggu, suara dari mikrofon
sampai draf — termasuk Mode Menyimak yang tidak menuntut tangan sama sekali. Dua
perangkat sungguhan sudah pernah berada di satu ruang dan sepakat.

Yang **paling menentukan** dari sisa pekerjaannya: klaim aksesibilitasnya sudah
diperiksa mesin dan belum pernah sekali pun didengar manusia. Antarmuka Inggris
— yang sampai kemarin paling terlihat di daftar ini — sudah selesai (D87).

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

115 uji (`npm test`), 12 uji server (`npm run test:server`), 7 uji dua perangkat
(`npm run test:people`), dan 27 kasus eval. Mencakup aturan 1, 4, 5, satu pintu
data, hitungan suara, alur suara per perangkat (D74), dokumen Yjs (D75),
kehadiran (D78), kata pemicu Mode Menyimak (D80), dan peredaman tawaran alat
(D82). Belum: tata letak, dan orchestrator selain set uji eval.

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
| AudioWorklet | Ada; selama sakelar bicara, atau selama Mode Menyimak |
| Silero VAD (ONNX Runtime Web) | Ada, Worker sendiri (D80) |
| ASR lokal (transformers.js WebGPU) | Ada (D65) |
| Kalimat kalengan | Masih tersedia sebagai pilihan "Ucapan contoh" |
| Model disajikan lokal | Ada — `npm run models`, server di `/models` (D81) |
| Runtime ONNX disajikan lokal | Ada — disalin ke `public/ort/` saat dev dan build (D81) |

Yang tersisa: akurasi Bahasa Indonesia `whisper-base` belum diukur dengan ucapan
manusia; bila kurang, `whisper-small` tinggal dipilih. Mode Menyimak sudah diuji
logikanya di Node, **belum dengan mikrofon sungguhan** — pane uji memblokir
mikrofon, jadi pemuatan model VAD dan pemenggalan kalimatnya belum pernah
terlihat berjalan.

### 2.4 Kolaborasi sungguhan

Semua yang menghubungkan satu orang dengan orang lain belum ada:

- ~~**Hocuspocus** — sinkronisasi Yjs~~ — ada, SQLite (D76)
- ~~**Room service**~~ — ruang, token, ruang tunggu, OpenAPI (D79)
- **PostgreSQL** — untuk mode lintas daerah; mode kelas sudah SQLite
- ~~**Kehadiran sungguhan**~~ — lewat Awareness, dengan chip sambungan (D78)
- ~~**Permintaan masuk sungguhan**~~ — ketukan dan jawaban lewat server (D79)

~~Konsekuensi yang jarang disebut: belum pernah ada dua orang di satu ruang.~~
Sudah: `npm run test:people`, tujuh uji dengan dua perangkat sungguhan terhadap
server sungguhan — dua dokumen, dua store, dua id aktor, dua soket. Termasuk
ganti nama dan pindah bersamaan (D9), pindah bersilangan (D10), hapus sambil
orang lain menambah anak, perangkat yang pergi lalu kembali, dan undo yang hanya
menarik kembali miliknya sendiri.

**Yang belum: dua manusia di dua mesin.** Yang sudah diuji adalah dua klien, dan
keduanya berperilaku persis seperti yang dirancang — bukan seperti orang.

### 2.5 Aksesibilitas: markup sudah diperiksa mesin, bunyinya belum

Ini yang paling tidak nyaman di seluruh dokumen.

Markup-nya kini diperiksa, bukan cuma diyakini: pola ARIA tree, roving tabindex,
nama pada setiap kontrol, live region — semuanya lulus, dan pemeriksaannya
menemukan dua yang gagal dan sudah diperbaiki (seluruh halaman ruang cuma punya
satu heading, dan landmark-nya tidak bernama). Rinciannya di
`docs/uji-pembaca-layar.md`.

Tapi **belum pernah dijalankan dengan NVDA, JAWS, atau VoiceOver.** Produk yang
klaim intinya aksesibilitas tidak boleh menganggap ARIA yang ditulis benar sama
dengan ARIA yang terdengar benar. Naskah satu putaran NVDA sudah ditulis; yang
belum ada adalah telinga yang menjalankannya.

Yang perlu:

1. Satu putaran penuh dengan NVDA di Windows — buat simpul, pindah, voting,
   telusur audio, jawab usulan.
2. Ukur apakah antrean narasi benar-benar menunggu jeda bicara.
3. Uji dengan orang yang memakai pembaca layar setiap hari, bukan dengan kami
   yang baru menyalakannya.

Nomor 3 yang paling menentukan dan paling sering dilewati.

### 2.6 Rasa cepat: sebagian sudah diukur

Kanvas dengan 200 simpul sudah dicoba dan tidak bermasalah: proyeksi dan tata
letak 0,25 ms (0,46 ms di 500 simpul, lima bentuk), dan **nol long task** baik
saat menyeret 30 frame maupun saat berganti bentuk. Ruang ujinya dibuat lewat
server dengan `npm run big-room`, angkanya dari `npm run bench:layout`.

Yang masih belum diukur dari bagian 10:

| Yang dijanjikan | Cara memeriksanya |
| --------------- | ----------------- |
| Tata letak inkremental menahan posisi lama | Ukur pergeseran simpul lama saat satu simpul baru mendarat |
| Penanda kehadiran ~10/detik | Belum ada penanda sungguhan untuk diukur |
| Transkrip mengalir | Sudah, tapi ASR-nya palsu |

Yang sudah tidak jadi kekhawatiran: 200 simpul. Yang belum pernah dicoba
sekarang 2.000, dan itu bukan angka rapat.

### 2.7 Hal-hal kecil yang berbohong

- ~~**Kursor agen tidak punya tempat berdiri untuk langkah templat.**~~ Selesai:
  kartu bayangan di tempat papan akan mendarat, kursornya berdiri di situ (D83).
- ~~**Tawaran alat belum diredam.**~~ Selesai (D82).
- ~~**Antarmuka Inggris baru separuh.**~~ Selesai (D87): sekitar 300 kalimat di
  40 berkas, diperiksa di peramban halaman per halaman. Sakelar ID/EN kini juga
  ada di halaman masuk, tidak cuma di dalam ruang. **Yang masih Indonesia: isi
  templat** — enam templat menghasilkan simpul berjudul Indonesia apa pun bahasa
  antarmukanya. Itu pilihan yang belum diambil, bukan yang terlupa: judul simpul
  memang tidak diterjemahkan (D69), dan templat berada tepat di batasnya.
- **D53 dan kodenya tidak sepakat.** D53 menyatakan templat selalu mendarat
  berdiri sendiri; `orchestrator.ts` menempelkannya ke simpul terfokus, dan
  pratinjaunya berbunyi "di bawah induk terpilih". Salah satunya harus mengalah.

### 2.8 Ketahanan

- **Tidak ada error boundary.** Satu galat render membuat layar putih.
- **Tidak ada CI.** `tsc`, `vite build`, dan `npm run eval` dijalankan manual.
- **Latensi model 6-12 detik.** Terukur: prefill 82 ms, decode 23 tok/detik, dan
  jawabannya 146-270 token karena tiap field di skema JSON `required`. Tanpa
  skema: 31 token, 1,6 detik.
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
