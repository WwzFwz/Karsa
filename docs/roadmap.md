# Dari sini sampai selesai

Diperiksa langsung ke kodenya, 8 September 2026. 68 berkas, ~12.900 baris,
33 commit.

Dokumen ini sengaja tidak menyenangkan. Yang berguna dari daftar seperti ini
bukan bagian "sudah", melainkan bagian "belum" yang ditulis cukup jujur sampai
bisa dikerjakan.

---

## Ringkasan satu paragraf

Yang sudah jadi adalah **produknya, dijalankan dengan data palsu**: model data
dan penegak aturannya nyata, lima bentuk tata letak nyata, tiga alat nyata,
orchestrator dengan model lokal sungguhan nyata. Yang belum ada adalah
**semua yang menghubungkan satu orang dengan orang lain** — sinkronisasi,
kehadiran, penyimpanan — dan **semua yang menghubungkan suara sungguhan dengan
sistem** — VAD, ASR. Ditambah satu lubang yang tidak enak: **belum ada satu pun
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
| Set uji orchestrator | 22 kasus, dua penyedia (D62) |
| Undo snapshot + narasi + earcon | Log tetap tambah-saja (D21) |
| Outline ARIA tree sungguhan | Bukan daftar div |
| Telusur audio | Satu nada per simpul, tinggi = kedalaman |
| Palet perintah `Ctrl+K` | 46 entri, disusun dari registry (D56) |
| Enam halaman + dasbor | Bagian 14 terpenuhi |
| Ruang terkunci + ruang tunggu | Ala Zoom, di panel Peserta (D37) |

---

## 2. Belum ada — diurutkan menurut apa yang paling merugikan

### 2.1 Uji otomatis untuk `core/` — **paling mendesak**

Belum ada satu pun, kecuali set uji orchestrator.

Yang paling perlu, dan alasannya:

| Yang diuji | Kenapa |
| ---------- | ------ |
| `projectTree` pemulihan siklus | Bagian 9 menyebutnya risiko yang harus benar sejak awal. Sekarang cuma bisa dibuktikan lewat tombol "paksa pemindahan bersilangan" — dibuktikan dengan tangan, tiap kali |
| `order.ts` indeks pecahan | Kalau kunci urutan tabrakan atau kehabisan presisi, urutan saudara rusak diam-diam |
| `apply.ts` tiap penolakan | Tiap `checkMove`, `checkTitle`, `checkKind` yang menolak wajib punya kasus |
| `narrate()` semua tipe peristiwa | Aturan 5 bilang tiap peristiwa punya kalimat; belum ada yang memastikan tidak ada yang terlewat |
| `tally.ts` | "Peristiwa terakhir per aktor menang" — kasus Budi berubah pikiran ada di data contoh, belum jadi uji |

Ongkosnya kecil: `core/` sengaja tidak mengimpor React, jadi bisa dijalankan di
node persis seperti `npm run eval`. Tidak ada dependensi baru yang diperlukan.

### 2.2 Isi ruang hilang saat halaman dimuat ulang

Dokumen hidup di memori. Tekan F5, semuanya hilang. Daftar ruang, tema, dan
pilihan penyedia bertahan di `localStorage`; isinya tidak.

Untuk demo ini menakutkan, untuk produk ini mustahil. Perbaikannya sudah ada di
rencana arsitektur: **IndexedDB sebagai salinan lokal**, yang juga langkah
pertama menuju kerja luring.

### 2.3 Suara sungguhan

| Bagian | Status |
| ------ | ------ |
| AudioWorklet | Belum |
| Silero VAD (ONNX Runtime Web) | Belum |
| ASR lokal (transformers.js WebGPU) | Belum |
| Kalimat kalengan | Dipakai sekarang |

Ini yang paling terlihat sebagai "belum jadi", tapi sengaja ditunda: bagian 14
menyatakan tenggat terdekat adalah antarmuka yang bisa dilihat dan diklik.
Sambungannya sudah benar, jadi ASR sungguhan masuk sebagai satu penyedia, bukan
tulis ulang.

### 2.4 Kolaborasi sungguhan

Semua yang menghubungkan satu orang dengan orang lain belum ada:

- **Hocuspocus** — sinkronisasi Yjs
- **Room service** — membuat ruang dan token tanpa akun
- **PostgreSQL** — snapshot dan metadata (SQLite untuk mode kelas)
- **Kehadiran sungguhan** — sekarang data contoh; empat peserta itu palsu
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

- **"Perapi judul"** terdaftar di `AGENTS`, tidak pernah dipanggil. Jalankan
  atau cabut namanya.
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

## 3. Urutan yang saya sarankan

Diurutkan menurut **risiko yang dihilangkan per jam kerja**, bukan menurut yang
paling menarik.

### Sebelum presentasi

1. **Uji `core/`** — pemulihan siklus, indeks pecahan, penolakan, narasi.
   Menghilangkan risiko terbesar yang tersisa, dan tanpa dependensi baru.
2. **IndexedDB** — muat ulang halaman berhenti menghapus rapat.
3. **Error boundary** — layar putih di depan penilai lebih mahal daripada fitur
   apa pun yang bisa ditambahkan di waktu yang sama.
4. **Satu putaran NVDA** — bahkan satu putaran akan menemukan sesuatu.
5. **Cabut atau jalankan "Perapi judul"**, dan redam tawaran alat.

### Sesudahnya, kalau proyek diteruskan

6. **Hocuspocus + room service + PostgreSQL** dalam satu kontainer.
7. **Kehadiran sungguhan**, lalu ukur 10 penanda per detik.
8. **ASR + VAD lokal** sebagai penyedia di balik sambungan yang sudah ada.
9. **Uji dengan pengguna pembaca layar sungguhan.** Ini yang mengubah produk,
   bukan daftar ini.
10. **Alat tabel perbandingan**, lalu pengamat dinamika kalau lima aturannya
    terpenuhi (`docs/agent-design.md`).

---

## 4. Yang sengaja tidak akan dibangun

Supaya daftar "belum" tidak dibaca sebagai "kurang":

Kanal percakapan, pesan pribadi, manajemen tugas, pencarian lintas ruang,
aplikasi telepon genggam, menggambar bebas, izin berlapis. Panggilan video
paling akhir, mati secara bawaan, dan ruang wajib tetap berfungsi penuh
tanpanya.

Ditambah dua yang diputuskan sepanjang jalan:

- **Penata letak bukan agen** (`docs/agent-design.md` bagian 5). Peletakan itu
  algoritma; yang jadi penilaian cuma pemilihan bentuk visual.
- **Layanan awan tidak pernah jadi cadangan otomatis.** Kalau model lokal tidak
  ada, jawabannya "model lokal tidak ada", bukan diam-diam mengirim ke server
  orang lain.
