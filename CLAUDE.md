# Kanvas Setara

Ruang kerja kolaboratif berbasis web yang mengubah ucapan dan teks menjadi visual
bersama, dikerjakan beberapa orang pada waktu yang sama. Pembedanya: kanvasnya
dapat dioperasikan tanpa tangan dan diikuti tanpa mata.

**Bahasa antarmuka: Bahasa Indonesia. Bahasa kode, nama variabel, dan komentar:
Bahasa Inggris.**

---

## 1. Masalah (MATI - jangan diubah tanpa membicarakannya dengan pemilik proyek)

Hasil kerja tim daring hampir selalu berwujud visual. Ikut berkontribusi di sana
menuntut dua kemampuan sekaligus: **membuat** isi kanvas, dan **mengikuti**
perubahannya pada saat perubahan itu terjadi. Keduanya tertutup bagi penyandang
disabilitas, dan justru dari dua arah yang berlawanan.

- **Persona A - disabilitas motorik tangan.** Masih bisa melihat, tidak bisa
  membuat. Menggambar, menarik panah, dan menyeret elemen semuanya bertumpu pada
  kendali kursor yang presisi.
- **Persona B - tunanetra dan low vision.** Bisa berbicara, tidak bisa mengikuti.
  Kanvas dipahami dengan mata, sementara percakapan rapat dipenuhi rujukan tunjuk
  seperti "yang ini kita pindahkan ke sini".

Akibatnya peran mereka bergeser dari penyusun menjadi pendengar. Gagasannya baru
sampai ke kanvas apabila ada rekan yang bersedia menuliskannya.

**Celah yang belum digarap siapa pun: kesadaran situasional selama kolaborasi
berlangsung.** Alat papan kerja sejenis sudah bisa dibaca pembaca layar, tetapi
belum bisa *diikuti saat rapat sedang berjalan*. Di situlah produk ini mengambil
tempat.

## 2. Ide inti (MATI)

**Satu model data, tiga tampilan yang setara:**

1. Kanvas visual
2. Outline teks yang terbaca pembaca layar
3. Penelusuran lewat bunyi

Ketiganya **bukan salinan** satu sama lain, melainkan tampilan atas data yang
sama. Selalu berubah bersamaan, mustahil menampilkan isi yang berbeda.

Bentuk visual **tidak dipatok pada mind map**. Ia menyesuaikan konteks yang
diucapkan: peta gagasan, diagram alur, garis waktu, bagan kolom, atau hierarki.
Semuanya hanyalah **algoritma tata letak yang berbeda dari model yang sama**,
bukan tipe data baru.

## 3. Fitur utama

- Membangun dan mengubah seluruh isi kanvas hanya dengan berbicara, atau
  sepenuhnya lewat papan ketik.
- Sebelum kanvas bersama berubah, pengguna melihat lebih dulu apa yang didengar
  dan dipahami sistem sebagai **draf**, lalu memutuskan menerapkan atau
  membatalkan.
- Pengguna tunanetra membaca seluruh isi kanvas memakai pembaca layar atau
  braille miliknya sendiri, dan mengetahui perubahan **pada saat perubahan itu
  berlangsung** lewat bunyi pendek yang tidak menabrak percakapan.
- Semua orang tahu siapa hadir, siapa sedang berbicara, dan bagian mana yang
  sedang ditunjuk rekannya - supaya "yang ini" tetap punya rujukan yang jelas.
- Beberapa orang menyunting bagian berbeda pada saat bersamaan tanpa saling
  menimpa; komentar menempel pada gagasan; porsi kontribusi terlihat di akhir
  sesi.
- Seluruhnya berjalan tanpa isi diskusi keluar dari perangkat, dan tanpa biaya
  per pemakaian.

## 4. Sembilan aturan yang tidak boleh dilanggar (MATI)

Ini bukan preferensi gaya. Melanggar salah satunya membatalkan klaim inti produk.
**Periksa ulang setiap kali menambah fitur.**

1. **Satu induk.** Setiap simpul punya tepat satu induk. Tanpa pohon yang pasti,
   outline dan telusur audio tidak dapat dibentuk. Hubungan lain disimpan sebagai
   **relasi tambahan** yang tidak memindahkan simpul di dalam pohon.
2. **Tidak ada makna pada koordinat.** Arti yang bergantung pada letak di layar
   hilang bagi yang tidak melihat. Inilah yang membuat pergantian bentuk visual
   menjadi aman.
3. **Semua isi bermakna punya tipe.** Tidak ada menggambar bebas.
4. **Judul simpul dibatasi** agar dapat disebut dalam satu tarikan napas.
5. **Setiap operasi menghasilkan peristiwa yang dapat dinarasikan dalam satu
   kalimat.** Kalau sebuah perubahan tidak bisa diberi nama, jangan dibuat.
6. **Tiga jalur sekaligus.** Setiap fitur wajib dapat dijalankan lewat papan
   ketik, terbaca sebagai teks, dan menghasilkan peristiwa audio. Fitur yang
   tidak bisa ketiganya tidak masuk.
7. **Aksesibilitas aktif secara bawaan.** Tidak ada tombol "mode aksesibel".
8. **Setiap perubahan wajib dapat dibatalkan dan wajib dinarasikan. Perubahan
   yang sulit dipulihkan wajib dikonfirmasi lebih dulu.** Penambahan yang ringan
   boleh langsung diterapkan; penghapusan, pemindahan, dan pergantian bentuk
   kanvas tetap lewat gerbang; parsing yang ambigu atau berkeyakinan rendah
   selalu lewat gerbang.
9. **Audio adalah sumber daya langka.** Default diam; peristiwa memakai bunyi
   pendek bukan kalimat; narasi menunggu jeda bicara.

> Catatan aturan 8, diganti 7 September 2026. Bunyi lamanya "perintah suara
> wajib melewati draf". Aturan itu cacat karena dua hal. Pertama, ia menghukum
> persona yang seharusnya dibela: bagi pengguna disabilitas motorik, suara
> adalah jalur utama, dan konfirmasi untuk setiap satu simpul membuat bicara
> lebih lambat daripada mengetik. Kedua, ia sebenarnya tambalan untuk ketiadaan
> undo. Yang membatalkan klaim inti bukan perubahan yang cepat, melainkan
> perubahan yang **tidak dinarasikan atau tidak bisa dibatalkan** - di situlah
> kesadaran situasional hilang.

> Catatan penyelarasan aturan 6 dan 9: "menghasilkan peristiwa audio" berarti
> fitur itu **memancarkan peristiwa ke audio bus**. Profil bunyi yang menentukan
> peristiwa mana yang terdengar. Diam secara bawaan bukan pelanggaran aturan 6.

## 5. Dua pertanyaan penilai ide baru

1. Apakah ide itu membantu orang mengubah ucapan atau teks menjadi visual
   bersama?
2. Apakah ketiga tampilan tetap setara setelahnya?

Kalau keduanya iya, kerjakan lalu beri tahu pemilik proyek. Kalau salah satunya
tidak, jangan dikerjakan meskipun idenya bagus.

## 6. Arsitektur klien (HIDUP sebagian - lihat bagian 11)

- React + TypeScript + Vite.
- Kanvas: React Flow, tata letak otomatis dari ELK di dalam Web Worker. ELK
  dipilih karena deterministik: semua orang melihat susunan yang sama tanpa perlu
  mengirim koordinat.
- Dokumen: Yjs, **satu dokumen per ruang**. Kehadiran lewat **Yjs Awareness**,
  bukan lewat dokumen.
- Salinan lokal di IndexedDB, supaya pekerjaan tetap berjalan ketika jaringan
  terputus lalu digabungkan kembali setelah tersambung.
- Bunyi: Web Audio API oscillator, **tanpa berkas audio sama sekali**.
- Narasi: diserahkan kepada pembaca layar pengguna lewat ARIA. **Jangan membuat
  mesin text-to-speech sendiri.**
- ELK, pengenalan suara, dan deteksi suara masing-masing di Worker sendiri.
  Kanvas tidak boleh tersendat sedetik pun ketika model sedang berpikir.

### Satu pintu menuju data

```
papan ketik / tetikus ---------------> command --+
                                                 +--> core model (validator aturan)
suara --> draf lokal --> [Terapkan] --> command --+              |
                                                                 v
                                                          dokumen (Yjs)
                                                                 |
                              +----------------------------------+---------------------+
                              v                                  v                     v
                           Kanvas                            Outline                 Audio
```

**Tidak boleh ada jalan lain dari antarmuka menuju data. Tidak boleh ada
tampilan yang menurunkan isinya dari tampilan lain.**

## 7. Arsitektur server (HIDUP sebagian)

- Sinkronisasi: Hocuspocus, tanpa state, instans bisa ditambah.
- Room service sederhana: NestJS + OpenAPI, membuat ruang dan token tanpa akun.
- Redis: penanda kehadiran, penghubung antar instans.
- PostgreSQL: snapshot dokumen berkala dan metadata ruang. SQLite untuk mode
  kelas.
- Traefik di depan. Pengamatan lewat OpenTelemetry ke Grafana.

**Yang melintasi jaringan hanya dua hal: perubahan dokumen dan penanda
kehadiran.** Tidak ada audio, gambar, maupun koordinat. Justru karena itu ruang
ini tetap nyaman dipakai pada sambungan yang lemah.

Dua mode pemasangan, **beda konfigurasi saja**:

- **Mode kelas** - satu kontainer di laptop pengajar, SQLite, jaringan lokal,
  tanpa internet sama sekali.
- **Mode lintas daerah** - klaster dengan Redis dan PostgreSQL, boleh dipasang
  sendiri oleh institusi.

## 8. Pipeline AI - seluruhnya di perangkat (janji MATI)

```
AudioWorklet (hanya selama sakelar ditahan)
  +-> Silero VAD (ONNX Runtime Web) --> penanda "sedang bicara"
        +-> ASR lokal (transformers.js WebGPU) --> transkrip mengalir
              +-> penyusun konteks (outline ringkas, simpul fokus, kandidat judul)
                    +-> AI Gateway --> Ollama, constrained decoding skema JSON
                          +-> validator domain
                                |- gagal -> clarify / raw_text (kanvas tidak berubah)
                                +- sah   -> draf lokal -> [Terapkan] -> command
```

- Yang dikirim ke model adalah **struktur, bukan tangkapan layar** - lebih kecil
  dan lebih tepat.
- **Constrained decoding berskema JSON**, bukan sekadar meminta model membalas
  dalam bentuk JSON. Model kecil gagal bukan karena bodoh, melainkan karena
  keluarannya tidak konsisten.
- Bila ambigu: tawarkan pilihan. Bila tidak dikenali: tampilkan ucapan apa adanya
  sebagai teks yang dapat disunting. **Sistem tidak boleh pernah menebak pada
  kanvas milik bersama.**
- Penyedia model dapat diganti lewat satu antarmuka. Bawaan Ollama; WebLLM untuk
  yang tidak mau memasang apa pun; layanan awan hanya aktif bila dinyalakan
  secara sadar disertai perubahan lencana di antarmuka. **Layanan awan tidak
  pernah menjadi cadangan otomatis.**
- **Web Speech API dilarang** - ia mengirim audio ke server Google dan itu
  membatalkan klaim inti produk.

## 9. Risiko yang ditangani sejak awal

**Yjs tidak punya pohon dengan operasi pindah yang aman.** Bila dua orang
memindahkan simpul secara bersilangan, hasil gabungannya bisa membentuk lingkaran
dan merusak outline serta telusur audio. Ini menabrak aturan 1.

Penanganan: pemeriksaan siklus **deterministik** setelah setiap penggabungan,
aturan yang sama di semua perangkat. Pembatalan diperlakukan **bukan sebagai
kerusakan melainkan sebagai perilaku yang dirancang**, lengkap dengan bunyi
bentrok dan pengumuman singkat.

**Tidak boleh ada kode yang menyentuh hubungan induk-anak sebelum ini beres.**

## 10. Tiga hal yang menentukan rasa cepat

Pengaruhnya lebih besar daripada optimasi apa pun.

1. **Tata letak inkremental** yang menahan posisi simpul lama. Kanvas yang
   melompat setiap ada simpul baru membuat produk terasa rusak, dan pengguna low
   vision paling menderita.
2. **Penanda kehadiran dibatasi kira-kira 10 kali per detik**, dengan interpolasi
   di sisi penerima.
3. **Transkrip mengalir** - itulah yang membuat tiga detik terasa nol.

## 11. Batas kebebasan

**MATI - jangan diubah tanpa membicarakannya dengan pemilik proyek:**

- Masalah beserta kedua personanya (bagian 1)
- Kesembilan aturan (bagian 4)
- Prinsip satu model dengan tiga tampilan setara (bagian 2)
- Janji bahwa audio tidak pernah keluar dari perangkat (bagian 8)
- Daftar yang tidak dibangun (bagian 12)

**HIDUP - diharapkan diisi lebih baik daripada yang dibayangkan pemilik proyek:**

- Model datanya sendiri
- Cara sistem memilih bentuk visual dari apa yang diucapkan, dan peralihan antar
  bentuknya
- Rasa dari alur suara ke draf ke terapkan
- Kosakata bunyi (masih tebakan, boleh dirancang ulang sepenuhnya)
- Cara "siapa menunjuk apa" diungkapkan ke ketiga tampilan
- Struktur folder, cara pengujian, bentuk API internal, trik performa apa pun

**DI ANTARA - tumpukan teknologi.** Keputusan bawaan, bukan pantangan. Kalau ada
yang keliru, sebutkan sebelum menulis kode beserta alasannya; pemilik proyek yang
memutuskan.

## 12. Tidak dibangun dan tidak perlu diusulkan (MATI)

Kanal percakapan, pesan pribadi, manajemen tugas, pencarian lintas ruang,
aplikasi telepon genggam, menggambar bebas, izin berlapis.

Panggilan video ditaruh paling akhir apabila semua sudah berjalan, mati secara
bawaan, dan ruang wajib tetap berfungsi penuh tanpanya.

## 13. Urutan pengerjaan

| Tahap  | Isi |
| ------ | --- |
| **P0** | Model data, sinkronisasi, render kanvas, operasi lengkap lewat papan ketik, outline tersinkron |
| **P1** | Suara menjadi operasi: rekaman sampai draf yang bisa diterapkan |
| **P2** | Bentuk visual adaptif, cukup dua bentuk dulu |
| **P3** | Kehadiran: siapa hadir, siapa berbicara, siapa menyorot bagian mana |
| **P4** | Lapisan audio: bunyi peristiwa, penelusuran lewat papan ketik, mode rapat dan mode telaah |
| **P5** | Komentar per elemen, atribusi jalur masukan, ringkasan kontribusi, lencana pemrosesan lokal |

## 14. Tahap yang sedang dikerjakan sekarang

**Tenggat terdekat bukan produk jadi, melainkan laporan yang membutuhkan
rancangan antarmuka per halaman.** Yang dibutuhkan sekarang adalah **tampilan
yang bisa dilihat dan diklik**, bukan sistem yang berfungsi penuh.

Belum perlu: server, sinkronisasi, Ollama, pengenalan suara. Semua digantikan
tombol dan data contoh. **Aplikasi React yang benar-benar jalan dengan data palsu
di dalam memori.**

Enam halaman:

1. Masuk dan bergabung ke ruang
2. Ruang kanvas
3. Tampilan daftar teks bertingkat (outline)
4. Panel pemeriksaan perintah dan konfirmasi draf
5. Panel daftar pengguna dan percakapan yang menempel pada elemen
6. Ringkasan akhir sesi dengan porsi kontribusi

**Empat hal yang harus sudah benar sejak awal** - semuanya soal struktur, bukan
riasan:

1. Navigasi papan ketik **lengkap**, bisa dipakai tanpa tetikus sama sekali.
2. Outline memakai **pola ARIA tree yang sungguhan**, bukan daftar div biasa.
3. Kanvas dan outline **membaca sumber data yang sama** - mengubah satu langsung
   mengubah yang lain.
4. Tombol bicara dan tombol telusur audio **berukuran sama dan berdampingan**.

## 15. Dokumen pendamping

- `docs/data-model.md` - model data: elemen, atribut wajib, jenis relasi, dan
  pemisahan operasi yang mengubah data versus yang hanya navigasi.
- `docs/keyboard-map.md` - peta pintasan papan ketik, satu sumber kebenaran.
- `docs/sound-vocabulary.md` - kosakata bunyi peristiwa.

## 16. Catatan keputusan

Diputuskan 7 September 2026, sesudah telaah arsitektur pertama.

| # | Keputusan | Alasan |
| - | --------- | ------ |
| D1 | Batas judul **60 karakter**. Uraian panjang pindah ke `note`. | Satu tarikan napas Bahasa Indonesia kira-kira 8-12 kata. Aturan 4 tidak boleh memaksa orang membuang informasi. |
| D2 | Server dipangkas jadi **satu kontainer**: Hocuspocus + SQLite + room service kecil di proses yang sama. Redis, PostgreSQL, Traefik, OTel, Grafana tetap ada di dokumen arsitektur sebagai jalur konfigurasi mode lintas daerah, tidak dibangun. | Tujuh komponen untuk melayani dua hal. Redis baru berguna bila Hocuspocus lebih dari satu instans. |
| D3 | **whisper.cpp dicoret.** transformers.js WebGPU saja, jatuh ke WASM bila perlu. | Dua jalur pengiriman berarti dua jalur bug, dan sidecar membatalkan "buka browser, langsung jalan". Anggaran waktu ASR dikoreksi jadi 2-6 detik, ditutupi transkrip mengalir. |
| D4 | **"Sedang bicara" diambil dari sakelar bicara**, bukan VAD selalu hidup. VAD selalu-hidup jadi opsi sadar belakangan. | Mikrofon hidup hanya saat sakelar aktif - janji privasi yang bisa diucapkan dalam satu kalimat. |
| D4b | Sakelar bicara **mengunci bila diketuk, dan berperilaku tekan-tahan bila ditahan.** Direvisi 7 September 2026. | Tekan-tahan itu bawaan yang keliru justru bagi orang yang produk ini bela: persona A memakai suara karena menekan dan menahan itu sulit, dan meminta mereka menahan tombol selama satu kalimat memindahkan hambatan yang sama ke tempat baru. |
| D4c | **Usulan bisa dijawab dengan suara.** Saat usulan terpampang, ucapan berikutnya dibaca sebagai jawaban, bukan perintah baru. | Ini yang membuat suara menjadi lingkaran penuh: bicara, tinjau, jawab. Tidak ada satu pun langkahnya yang menuntut jari. |
| D5 | **Susunan kanvas boleh berbeda antar perangkat** demi stabilitas posisi lokal. "Semua orang melihat susunan yang sama" turun dari klaim menjadi kecenderungan. | Aturan 2 melarang makna disimpan di koordinat, jadi perbedaan susunan tidak merugikan siapa pun. Kanvas yang melompat merugikan. |
| D6 | **Operasi tidak pernah dimiliki oleh tampilan.** Tidak ada seret-lepas sama sekali. `moveNode` dijalankan lewat pemilih target, bukan kursor. | Kalau memindahkan simpul hanya bisa lewat seret, persona A tetap terkunci walau kanvasnya terbaca. Kanvas hanya menggambar; ia tidak punya kemampuan yang tidak dimiliki outline. |
| D7 | Ada **antrean narasi milik sendiri** (`a11y/Announcer`) yang meredam ledakan perubahan dan menahan teks sampai penanda bicara padam, baru menyuntikkannya ke live region. | `aria-live="polite"` menunggu jeda pembaca layar, bukan jeda manusia yang sedang bicara. Aturan 9 menuntut yang kedua. |
| D8 | **Log peristiwa (`DocEvent`) masuk dokumen sejak P0**, lengkap dengan `actorId` dan `inputPath`. | Satu struktur melayani earcon, narasi ARIA, mode telaah, dan ringkasan kontribusi. Atribusi tidak bisa ditambahkan belakangan tanpa membuat halaman ringkasan berbohong. |
| D9 | `parentId` sebagai **satu field LWW** + fractional index untuk urutan. Bukan `Y.Array` anak di dalam induk. | Bentuk `Y.Array` menghasilkan duplikat saat pindah bersilangan, dan duplikat tidak bisa dideteksi. Bentuk LWW paling buruk menghasilkan siklus, dan siklus bisa dipulihkan deterministik. |
| D10 | **Pemulihan siklus sebagai proyeksi saat membaca**, bukan mutasi saat menulis. Penulisan balik opsional, idempoten, oleh klien dengan `clientId` terkecil. | Kalau semua perangkat memperbaiki lalu sama-sama menulis, mereka saling menimpa. Sebagai fungsi murni, dokumen bersiklus tidak pernah tampak rusak di mana pun. |
| D11 | Fase mock memakai **renderer SVG sendiri**, bukan React Flow. | React Flow dievaluasi ulang di P0 sungguhan. Untuk fase mock, kendali penuh atas roving tabindex dan ARIA lebih berharga daripada fitur yang tidak dipakai, dan tanpa seret-lepas (D6) sebagian besar nilai React Flow hilang. |
| D12 | Tata letak mengikuti konvensi yang sudah dikenal: **kontrol utama di control bar bawah** (Zoom, Meet), **rail ikon kiri** untuk perpindahan tampilan (Miro, Figma, Linear), **toolbar aksi menempel di atas kanvas** (Miro). | Pengguna pertama kali sebaiknya menghabiskan perhatian untuk rapatnya, bukan untuk tata letak kita. |
| D13 | **Ikon SVG inline**, bukan icon font atau sprite dari CDN. | Mode kelas berjalan tanpa internet sama sekali; ikon yang gagal dimuat adalah tombol tanpa label. |
| D14 | Tipe simpul dibawa **empat jalur sekaligus**: ikon, kata, hue, dan siluet kartu bergaya Mermaid. | Warna saja gagal untuk sebagian orang, dan siluet meminjam kosakata diagram alur yang sudah dikenal. |
| D15 | Tema **terang dan gelap dengan pilihan eksplisit** (`data-theme`), bawaan mengikuti sistem. | Proyektor ruang kuliah dan ruangan redup menuntut jawaban berbeda, dan orang tidak seharusnya harus mengubah setelan sistem di tengah rapat. |
| D16 | Bentuk antarmuka mengikuti **Trido**: kartu mengambang di atas latar bernada, sidebar berlabel, dan **badge mode di tengah bilah atas**. Badge kami menyatakan kebalikannya — pemrosesan lokal, bukan model awan. | Perabot yang sama, janji yang berlawanan, dan itu justru janji yang menjadi dasar produk ini. |
| D17 | Kontrol utama pindah ke **dock mengambang** yang muncul di semua halaman, berisi status agen, Bicara, dan Telusur audio. | Suara harus bisa dipakai dari tampilan mana pun, bukan hanya dari halaman yang kebetulan memiliki panel draf. |
| D18 | Agen **mengumumkan kesiapan lalu menunggu**, dan simpul yang akan disentuh ditandai di kanvas serta dijelaskan di outline. Yang **tidak** ditiru dari Trido adalah otonomi: agen tidak pernah bertindak sendiri di kanvas bersama. | Aturan 8. Menunggu harus terlihat di tempat perubahan akan mendarat, bukan di panel yang harus dicari. |
| D20 | **Aturan 8 diganti** menjadi "dapat dibatalkan dan dinarasikan; yang sulit dipulihkan wajib dikonfirmasi". `undo` naik jadi operasi kelas satu dengan kalimatnya sendiri, pintasan `Ctrl+Z`, dan bunyi turun-lalu-mendarat. | Gerbang menyeluruh menaikkan ongkos interaksi persona A dua kali lipat, dan ia cuma ada karena undo belum ada. |
| D22 | **Kursor agen di kanvas.** Asisten berdiri di simpul yang akan diubahnya, menyebut apa yang sedang dikerjakan, dan menunggu jawaban di tempat itu. Diambil dari `AgentCursor` Trido. | Konfirmasi yang muncul di tempat pekerjaan akan mendarat langsung dipahami; konfirmasi yang sama di panel samping harus dicari. Semua isinya tetap diumumkan dan tetap bisa dijawab dari dock, karena kursor di kanvas tidak berguna bagi yang tidak melihat kanvas. |
| D23 | **Menerapkan itu pertunjukan, bukan penumpahan.** Operasi yang disetujui mendarat satu per satu, kursor berpindah ke tiap sasaran, tiap langkah punya kalimat dan bunyinya sendiri. | Bedanya dengan Trido: mereka bertindak tanpa bertanya, kita bertanya dulu baru bertindak. Dan tiga operasi jadi tiga kalimat yang bisa diikuti pembaca layar, bukan satu "3 simpul ditambahkan" yang tidak menyebut di mana. |
| D24 | **Halaman Pengaturan** menampilkan penyedia model yang belum dibangun dalam keadaan nonaktif, bukan disembunyikan. Baris yang penting di tiap penyedia bukan nama modelnya, melainkan **ke mana kata-katanya pergi**. | Menyembunyikan opsi yang belum jadi mengajarkan bentuk produk yang keliru. Orang berhak melihat bahwa opsi awan ada, apa harganya bagi privasi, dan bahwa ia mati. |
| D21 | Undo memakai **snapshot**, bukan perintah kebalikan. Isi mundur, **log tetap tambah-saja**, dan peristiwa yang dibatalkan dikeluarkan dari hitungan kontribusi lewat `undoneEventId`. | Dokumen sudah disalin utuh pada setiap penulisan, jadi snapshot itu tepat dan tidak bisa melenceng. Menyembunyikan pembatalan dari log berarti membuat perubahan yang tidak bisa didengar siapa pun sesudahnya. |
| D19 | Panel kanan bisa disembunyikan (`\`), kanvas bisa layar penuh (`f`), dan **fokus selalu digulirkan ke dalam pandangan**. | Tanpa itu kanvas terbuka pada tepi atas dan bukan pada akar, dan menelusuri pohon besar dengan panah membuang cincin fokus keluar layar. |
