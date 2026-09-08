# Rencana implementasi

Rencana **menyeluruh**, dari nol sampai produk yang bisa dipasang institusi.
Semua yang ada di sini adalah pekerjaan yang direncanakan, termasuk yang sudah
selesai.

Yang menjawab "sekarang sudah sampai mana" adalah dokumen lain:
**`docs/status.md`**. Pemisahan ini disengaja — rencana yang ikut berubah tiap
kali sesuatu selesai berhenti jadi rencana, dan status yang bercampur rencana
berhenti bisa dipercaya.

| Dokumen | Menjawab |
| ------- | -------- |
| `rencana-implementasi.md` (ini) | Apa saja yang harus dibangun, urutannya, dan kenapa |
| `status.md` | Sudah sampai mana, per hari ini |
| `architecture.md` | Bentuk sistemnya |
| `agent-design.md` | Rancangan lapisan agen |

---

## Peta tahap

| Tahap | Isi | Selesai berarti |
| ----- | --- | --------------- |
| **P0** | Model data, operasi lengkap lewat papan ketik, outline tersinkron, render kanvas | Satu orang bisa membangun seluruh isi rapat tanpa tetikus, dan pembaca layar mengikutinya |
| **P1** | Suara jadi operasi: rekaman sampai draf yang bisa diterapkan | Satu kalimat yang diucapkan mendarat di kanvas lewat gerbang |
| **P2** | Bentuk visual adaptif | Isi yang sama bisa digambar sebagai peta gagasan atau bagan kolom tanpa berubah |
| **P3** | Kehadiran | Siapa hadir, siapa bicara, siapa menunjuk apa |
| **P4** | Lapisan audio | Bunyi peristiwa, telusur papan ketik, mode rapat dan telaah |
| **P5** | Komentar, atribusi, ringkasan kontribusi | Akhir sesi menunjukkan porsi tiap orang, dipecah menurut jalur masukan |
| **S1** | Server satu kontainer | Dua orang di dua laptop mengerjakan satu ruang |
| **S2** | Ketahanan dan pemasangan | Sekolah bisa memasangnya sendiri |
| **S3** | Skala lintas institusi | Klaster, kalau memang dibutuhkan |

P0–P5 adalah urutan dari bagian 13 CLAUDE.md. S1–S3 adalah kelanjutannya, dan
pemicu tiap tahapnya ada di `architecture.md` bagian 7.

---

## P0 — Model data dan papan ketik

**Kenapa duluan:** semua yang lain membaca model ini. Salah di sini berarti
menulis ulang semuanya.

| Pekerjaan | Catatan |
| --------- | ------- |
| Tipe `Node`, `Relation`, `Comment`, `DocEvent` | Tanpa koordinat, selamanya (aturan 2) |
| `parentId` LWW + indeks pecahan | Bukan array anak (D9) |
| Validator aturan 1–9 | Tiap penolakan punya kalimatnya sendiri |
| Pemulihan siklus sebagai proyeksi baca | Bukan mutasi tulis (D10) |
| `applyCommand` | Satu pintu menuju data |
| `DocEvent` + `narrate()` | Sejak P0, bukan ditambahkan belakangan (D8) |
| Undo snapshot | Isi mundur, log tetap tambah-saja (D21) |
| Render kanvas | Simpul HTML di atas lapisan SVG (D11) |
| Outline ARIA tree | Pola sungguhan, roving tabindex |
| Navigasi papan ketik lengkap | Tanpa tetikus sama sekali |
| Palet perintah `Ctrl+K` | Jalan menuju perintah yang tutsnya belum dihafal |
| **Uji `core/`** | Pemulihan siklus, indeks pecahan, penolakan, kelengkapan narasi |

Baris terakhir adalah bagian P0 yang paling gampang dilewati dan paling mahal
kalau dilewati: bagian 9 menyebut pemulihan siklus sebagai risiko yang harus
benar sejak awal.

---

## P1 — Suara jadi operasi

**Kenapa sesudah P0:** suara menghasilkan perintah. Perintahnya harus ada dulu.

| Pekerjaan | Catatan |
| --------- | ------- |
| Sakelar bicara | Ketuk mengunci, tahan berperilaku tekan-tahan (D4b) |
| Transkrip mengalir | Itu yang membuat tiga detik terasa nol |
| Penyusun konteks | Struktur, bukan tangkapan layar (bagian 8) |
| Orchestrator | Rute, alasan, tahap mana (D45, D46) |
| Constrained decoding berskema JSON | Per alat, bukan satu skema untuk semua (D41) |
| Panel draf | Tiga hasil punya ruang sama: paham, ragu, tidak paham |
| Kursor agen | Menunggu di tempat perubahan akan mendarat (D18, D22) |
| Jawab dengan suara | "Terapkan" diucapkan (D4c) |
| Terapkan sebagai pertunjukan | Satu per satu, tiap langkah punya kalimat (D23) |
| Set uji orchestrator | Negatif, ambigu, kalimat tunjuk (D62) |
| **AudioWorklet + Silero VAD** | Mikrofon hidup hanya selama sakelar aktif |
| **ASR lokal (transformers.js WebGPU)** | Jatuh ke WASM bila perlu (D3) |
| **Perapi judul dijalankan** | Atau namanya dicabut dari daftar tahap |
| **Redaman tawaran** | Ditolak sekali berarti tidak ditawarkan lagi di sesi itu |
| **Kursor agen untuk langkah templat** | Belum ada simpulnya sebelum templat mendarat |

---

## P2 — Bentuk visual adaptif

| Pekerjaan | Catatan |
| --------- | ------- |
| Lima algoritma tata letak | Satu model, bukan lima tipe data |
| Usulan bentuk dari isi | `suggestShape` mengusulkan, orang menerapkan |
| Penempatan tangan per bentuk | Milik perangkat, tidak pernah masuk dokumen (D31) |
| Tinggi kartu diukur | Bukan ditebak dari konstanta (D54) |
| Alat sebagai tata letak atas sub-pohon | Voting, retro, matriks (D40, D59) |
| Templat sebagai kumpulan `createNode` | Satu langkah undo (D44) |
| **Tata letak inkremental** | Menahan posisi simpul lama saat simpul baru mendarat |
| **Kanvas 200 simpul** | Belum pernah dilihat; data contoh 20 |
| **Alat tabel perbandingan** | Prasyarat pengamat dinamika |

---

## P3 — Kehadiran

| Pekerjaan | Catatan |
| --------- | ------- |
| Panel peserta | Siapa hadir, siapa bicara, menunjuk apa |
| Menunjuk sebagai id simpul | Bukan posisi kursor — itu yang membuat "yang ini" sampai ke ketiga tampilan |
| Ruang tunggu | Ala Zoom, di panel peserta (D37) |
| **Kehadiran sungguhan lewat Awareness** | Sekarang data contoh |
| **Pembatasan ~10 penanda per detik** | Dengan interpolasi di sisi penerima |
| **Konteks per orang** | `actorId` mengalir dari mikrofon sampai draf |
| **Antrean draf per orang** | Bukan satu antrean per ruang |

---

## P4 — Lapisan audio

| Pekerjaan | Catatan |
| --------- | ------- |
| Bus audio + kosakata earcon | Oscillator saja, tanpa berkas audio |
| Tiga profil bunyi | Diam, hemat, penuh |
| Antrean narasi sendiri | Menunggu jeda **bicara**, bukan jeda pembaca layar (D7) |
| Telusur audio | Satu nada per simpul, tinggi menyatakan kedalaman |
| Mode rapat dan mode telaah | Profil bawaan berbeda |
| **Uji dengan NVDA / JAWS / VoiceOver** | Belum pernah |
| **Uji dengan pengguna pembaca layar sungguhan** | Ini yang mengubah produk |

Dua baris terakhir adalah P4 yang sebenarnya. Sisanya persiapan.

---

## P5 — Komentar, atribusi, ringkasan

| Pekerjaan | Catatan |
| --------- | ------- |
| Komentar menempel pada simpul | Bukan kanal terpisah |
| `inputPath` di tiap peristiwa | Papan ketik, suara, tetikus, sistem |
| Ringkasan kontribusi | Dipecah menurut jalur masukan |
| Lencana pemrosesan lokal | Berubah kalau penyedia awan dinyalakan |
| Mode telaah | Berjalan mundur lewat sesi |

Angka di halaman ringkasan itu yang membedakan produk ini dari papan kerja
biasa: **kontribusi lewat suara tercatat setara dengan kontribusi lewat papan
ketik.**

---

## S1 — Server satu kontainer

**Pemicu:** butuh dua orang di satu ruang.

| Pekerjaan | Catatan |
| --------- | ------- |
| `YjsDocStore` | Menggantikan `MemoryDocStore` di balik antarmuka yang sama |
| Hocuspocus | Tanpa state; yang persisten cuma di basis data |
| Room service | Membuat ruang dan token, tanpa akun |
| PostgreSQL | Snapshot berkala + metadata ruang |
| SQLite untuk mode kelas | Satu berkas, satu laptop, tanpa internet |
| **IndexedDB** | Salinan lokal; muat ulang halaman berhenti menghapus rapat |
| Penggabungan setelah terputus | Bentrok bersilangan diuji oleh kenyataan, bukan cuma rancangan |

Baris IndexedDB sebenarnya bisa dikerjakan jauh lebih awal, dan sebaiknya
begitu: dia satu-satunya baris di tabel ini yang tidak butuh server sama sekali.

---

## S2 — Ketahanan dan pemasangan

| Pekerjaan | Catatan |
| --------- | ------- |
| Dockerfile satu kontainer | Mode kelas dijanjikan sebagai satu kontainer |
| Berkas compose | Untuk pemasangan institusi |
| CI | `tsc`, `vite build`, uji `core/`, `npm run eval` |
| Error boundary | Satu galat render tidak boleh jadi layar putih |
| Uji jendela sempit | Tata letaknya responsif, yang diperiksa selama ini jendela lebar |
| Pengukuran rasa cepat | Tiga hal di bagian 10, diukur bukan diyakini |
| Panduan pemasangan | Ditulis untuk pengajar, bukan untuk insinyur |

---

## S3 — Skala lintas institusi

**Pemicu:** satu instans tidak lagi cukup. Perkiraan kapasitas ada di
`architecture.md` bagian 7 — satu kampus muat di satu kontainer, jadi tahap ini
untuk pemasangan lintas institusi.

| Pekerjaan | Catatan |
| --------- | ------- |
| Beberapa instans Hocuspocus | Butuh Redis; menambah instans tanpa Redis cuma menambah bug |
| Redis | Penanda kehadiran dan penghubung antar instans |
| Ingress dengan sesi lengket | Hash konsisten pada id ruang |
| Kubernetes: HPA, PDB | HPA pada jumlah sambungan, bukan CPU |
| OpenTelemetry ke Grafana | Pengamatan |
| vLLM di server institusi | Sebagai penyedia model, bukan pengganti Ollama |

---

## Yang menyeberangi semua tahap

Pekerjaan yang tidak punya tahap sendiri karena harus ada di setiap tahap.

| Hal | Aturannya |
| --- | --------- |
| **Tiga jalur** | Tiap fitur wajib bisa lewat papan ketik, terbaca sebagai teks, dan memancarkan peristiwa audio. Fitur yang tidak bisa ketiganya tidak masuk (aturan 6) |
| **Satu kalimat per peristiwa** | Perubahan yang tidak bisa diberi nama tidak dibuat (aturan 5) |
| **Gerbang** | Tidak ada panah yang melompati persetujuan manusia (aturan 8) |
| **Aksesibilitas bawaan** | Tidak ada mode aksesibel untuk dinyalakan (aturan 7) |
| **Catatan keputusan** | Tiap keputusan yang mengubah bentuk produk masuk ke `CLAUDE.md` |

---

## Yang sengaja tidak dibangun

Kanal percakapan, pesan pribadi, manajemen tugas, pencarian lintas ruang,
aplikasi telepon genggam, menggambar bebas, izin berlapis. Panggilan video
paling akhir, mati secara bawaan, dan ruang wajib tetap berfungsi penuh
tanpanya.

Ditambah dua yang diputuskan sepanjang jalan:

- **Penata letak bukan agen.** Peletakan itu algoritma — deterministik, cepat,
  dan tidak menyimpan makna di koordinat. Yang jadi penilaian cuma pemilihan
  bentuk visual (`agent-design.md` bagian 5).
- **Layanan awan tidak pernah jadi cadangan otomatis.** Kalau model lokal tidak
  ada, jawabannya "model lokal tidak ada".
