# Karsa

Ruang kerja kolaboratif berbasis web yang mengubah ucapan dan teks menjadi visual
bersama, dikerjakan beberapa orang pada waktu yang sama. Pembedanya: kanvasnya
dapat dioperasikan tanpa tangan dan diikuti tanpa mata.

**Bahasa antarmuka: Bahasa Indonesia, dengan bahasa Inggris sebagai pilihan (D69).
Bahasa kode, nama variabel, dan komentar: Bahasa Inggris.**

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
2. **Tidak ada makna yang disimpan atau dikirim lewat koordinat.** Arti yang
   bergantung pada letak di layar hilang bagi yang tidak melihat. Inilah yang
   membuat pergantian bentuk visual menjadi aman.

   > Perjelas 7 September 2026. Aturan ini tentang **dokumen**, bukan tentang
   > perhitungan. Menghitung koordinat di perangkat itu wajar dan memang
   > dilakukan terus - tata letak, posisi kursor, uji-tumbuk, geser papan.
   > Yang dilarang adalah menyimpannya di dokumen atau mengirimkannya lewat
   > jaringan. `Node` tidak punya `x`, `y`, `width`, `height`, maupun `color`,
   > dan tidak boleh punya.
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

**Menyelesaikan aplikasinya, dengan rancangan sistem yang baik dan kode yang
mudah dibaca.** Diputuskan pemilik proyek 17 September 2026. Target laporan
sudah lewat dan tidak lagi mengarahkan pekerjaan.

Urutan:

1. **Fondasi kode** - batas impor dijaga skrip, uji `core/`, `RoomContext`
   dipecah jadi alur suara per perangkat (selesai, D74) dan lima provider dengan struktur
   folder baru (selesai, D77), `ollama.ts`, `CanvasView.tsx`, dan `speech.ts`
   dipecah (selesai, D85).
2. **Data sungguhan** - IndexedDB dan `YjsDocStore` di balik `DocStore` (selesai, D75), server (selesai, D76)
   satu kontainer (Hocuspocus + SQLite + room service), kehadiran lewat
   Awareness (selesai, D78), room service dengan token dan ruang tunggu sungguhan (selesai, D79).
3. **Pengalaman** - latensi model, mode Menyimak dan VAD (selesai, D80), uji NVDA
   (naskahnya di `docs/uji-pembaca-layar.md`; pemeriksaan mesinnya selesai, yang
   perlu telinga belum), uji pengguna.
4. **Pemasangan** - Dockerfile, CI, konfigurasi mode kelas dan ter-deploy.

**Sebelum commit:** `npm run check` - typecheck, batas impor, uji, dan eval.

**Empat hal yang harus sudah benar sejak awal** - semuanya soal struktur, bukan
riasan:

1. Navigasi papan ketik **lengkap**, bisa dipakai tanpa tetikus sama sekali.
2. Outline memakai **pola ARIA tree yang sungguhan**, bukan daftar div biasa.
3. Kanvas dan outline **membaca sumber data yang sama** - mengubah satu langsung
   mengubah yang lain.
4. Tombol bicara dan tombol telusur audio **berukuran sama dan berdampingan**.

## 15. Dokumen pendamping

Empat yang menjelaskan **rancangan**:

- `docs/architecture.md` - bentuk sistem: lapisan, satu pintu menuju data, model
  data, jalur suara, penyimpanan, dan skalabilitas empat tahap beserta
  pemicunya. Diagramnya juga tersedia sebagai PNG di `docs/img/`.
- `docs/rencana-implementasi.md` - rencana menyeluruh dari nol sampai produk
  yang bisa dipasang institusi: P0-P5, lalu S1-S3 untuk server dan skala.
- `docs/agent-design.md` - rancangan lapisan agen: jalur suara sampai keputusan,
  banyak orang dengan masukan berbeda, kenapa peletakan bukan agen, dan pengamat
  dinamika yang mati secara bawaan.
- `docs/data-model.md` - elemen, atribut wajib, jenis relasi, dan pemisahan
  operasi yang mengubah data versus yang hanya navigasi.

Satu folder untuk **laporan**, `docs/laporan/`:

- `README.md` - daftar isinya, supaya tidak perlu dicari.
- `lampiran-abc.md` - ringkasan produk, Lampiran A (use case dan ketiga aktor),
  B (arsitektur AI termasuk multi-agent), dan C (arsitektur aplikasi web).
- `lampiran-d.md` - Lampiran D: rancangan antarmuka per halaman, gambar lalu
  paragraf. Gambarnya di `docs/laporan/img/`, dihasilkan `npm run shots`.

Satu yang menjelaskan **keadaan**:

- `docs/status.md` - sudah sampai mana per hari ini, dan apa ongkos dari yang
  belum ada. Sengaja dipisah dari rencana: rencana yang ikut berubah tiap kali
  sesuatu selesai berhenti jadi rencana.
- `docs/uji-pembaca-layar.md` - apa yang sudah diperiksa mesin pada markup ARIA,
  dan naskah satu putaran NVDA untuk bagian yang tidak bisa diperiksa mesin.

Empat yang menjadi **satu sumber kebenaran** untuk bagian yang mudah melenceng:

- `docs/keyboard-map.md` - peta pintasan papan ketik.
- `docs/sound-vocabulary.md` - kosakata bunyi peristiwa.
- `docs/tools.md` - alat: kenapa alat itu tata letak di atas sub-pohon dan bukan
  jendela mengambang, dan cara menambah alat baru.
- `docs/agent.md` - orchestrator yang sudah ada: tiga jalur perutean, tahap yang
  diberi nama, set uji, dan cara menukar pencocok kata kunci dengan model
  sungguhan.

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
| D6 | **Operasi tidak pernah dimiliki oleh tampilan.** `moveNode` dijalankan lewat pemilih target, bukan kursor. | Kalau memindahkan simpul hanya bisa lewat seret, persona A tetap terkunci walau kanvasnya terbaca. Kanvas hanya menggambar; ia tidak punya kemampuan yang tidak dimiliki outline. |
| D6b | Aturannya diperhalus 7 September 2026, dari "tidak ada seret-lepas sama sekali" menjadi **"tidak ada operasi yang hanya bisa lewat seret"**. Menggambar relasi kini bisa lewat tarik dari titik sambung ala Figma, di samping dua-kali-klik dan `r`. | Larangan aslinya menyasar `moveNode`. Menggambar relasi menyimpan `fromId` dan `toId`, bukan lintasan, jadi tidak menabrak aturan 2 — dan gerakannya aman begitu ada jalur lain untuk perintah yang sama. |
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
| D31 | **Simpul boleh digeser dengan tangan, tetapi penempatannya milik perangkat.** Disimpan per bentuk visual, tidak pernah masuk dokumen dan tidak pernah lewat jaringan. Ada tombol "Tata letak otomatis" untuk membuangnya. | Ini jawaban atas "bisa tidak pakai koordinat tapi pergantian bentuk tetap jalan": bisa, asal koordinatnya bukan milik dokumen. Aturan 2 utuh apa adanya - tidak ada makna yang **disimpan** di koordinat. Tata letak otomatis tetap jadi dasar, penempatan tangan cuma lapisan tipis di atasnya, dan ganti bentuk berarti berhenti membaca lembar bentuk yang lama. D5 sudah menerima bahwa dua perangkat boleh menyusun ruang yang sama secara berbeda. |
| D31b | **Risiko yang diterima secara sadar:** sebagian orang akan mulai memberi arti pada letak - "yang berisiko saya taruh di kanan". Arti itu tidak sampai ke persona B dan tidak ada mekanisme yang bisa menyelamatkannya. | Mitigasinya bukan teknis melainkan menyediakan saluran yang lebih baik untuk maksud yang sama: tipe `kelompok`, hubungan antar simpul, dan urutan saudara. Sistem tidak pernah menjanjikan bahwa letak berarti sesuatu, dan simpul yang ditempatkan tangan diberi garis putus supaya jelas itu pendapat satu layar. |
| D29 | **Kanvas bisa diperbesar dan diperkecil**, termasuk paskan-ke-layar, `Ctrl` roda tetikus, dan `Ctrl` `+ - 0`. | Diagram yang melebihi jendela harus bisa dikecilkan, bukan dipotong. Sama seperti geser: ini keadaan pandangan, bukan dokumen, jadi dua orang boleh duduk di perbesaran berbeda tanpa berselisih apa pun — menunjuk tetap berjalan lewat id simpul. |
| D30 | **Penggulir otomatis menghormati chrome yang mengambang.** Inset dihitung dari elemen chrome itu sendiri, dan sisi mana yang ditutup disimpulkan dari bentuknya. | Kanvas penuh berarti jendela bukan lagi area yang terlihat. Sebelumnya simpul terfokus bisa mendarat separuh tertutup panel. Panel kanan berupa kolom di layar lebar dan lembar bawah di layar sempit, jadi inset yang ditulis untuk satu bentuk jadi omong kosong bagi yang lain. |
| D28 | **Kanvas bisa digeser** dengan menyeret latar kosongnya, atau tombol tengah tetikus di mana saja. Spasi sengaja tidak dipakai sebagai pengubah. | Menggeser papan itu navigasi murni — memindahkan pandangan, bukan simpul — jadi tidak menyentuh aturan 2 maupun D6. Spasi adalah sakelar bicara, dan orang yang paling butuh menggeser sering sedang menahannya. Padanan papan ketiknya sudah ada dan lebih baik: menelusuri pohon dengan panah menggulirkan simpul terfokus ke dalam pandangan dengan sendirinya. |
| D25 | **Kanvas jadi latar seluruh jendela**, seluruh chrome mengambang di atasnya, seperti FigJam. Offset chrome ditulis sebagai variabel supaya menyembunyikan sidebar atau panel langsung mengembalikan ruangnya ke kanvas. | Menaruh kanvas di dalam kartu di dalam kolom berarti benda yang orang datangi cuma kebagian sisa ruang. |
| D26 | Lencana "Mode Lokal" turun dari spanduk tengah jadi **chip status di sebelah avatar**. | Elemen yang ditengahkan di antara dua kelompok berbeda lebar tidak pernah terlihat di tengah, dan kalimat panjangnya lebih tepat jadi tooltip. Janjinya tetap terlihat, berhenti berteriak. |
| D27 | Tombol **Anak** dan **Judul** dicabut dari toolbar; keduanya sudah punya afordans langsung di simpul. Tombol panel dan layar penuh dicabut dari bilah atas; keduanya sudah ada di toolbar kanvas. | Satu perintah, satu tempat yang jelas. |
| D32 | **Halaman dasbor** berisi daftar ruang, bergaya dasbor berkas Mermaid: kartu bergambar isi ruangnya, tombol "Ruang baru" sebagai aksi pertama di area isi, dan "Bagikan" yang menyalin tautan. | Kartu bergambar membuat daftar bisa dipindai sebelum dibaca. Gambarnya `aria-hidden`, dan nama, kode, serta jumlah simpul ada di sebelahnya sebagai kata — jadi gambar itu tidak pernah jadi satu-satunya cara mengetahui isi ruang. |
| D33 | **Panel kanan dibuka dan ditutup lewat tabnya sendiri.** Mengklik tab yang sedang terbuka menutup panel; mengklik tab mana pun membukanya lagi. Tombol "Sembunyikan panel" dicabut. | Gerakan yang sama dengan ikon sidebar VS Code dan Figma. Satu kontrol yang melakukan keduanya lebih mudah ditemukan daripada dua kontrol yang masing-masing melakukan separuh. Saat tertutup, tab tetap terlihat sebagai rel sempit di tepi kanan — panel yang bisa ditutup butuh jalan pulang yang kelihatan. |
| D22 | **Kursor agen di kanvas.** Asisten berdiri di simpul yang akan diubahnya, menyebut apa yang sedang dikerjakan, dan menunggu jawaban di tempat itu. Diambil dari `AgentCursor` Trido. | Konfirmasi yang muncul di tempat pekerjaan akan mendarat langsung dipahami; konfirmasi yang sama di panel samping harus dicari. Semua isinya tetap diumumkan dan tetap bisa dijawab dari dock, karena kursor di kanvas tidak berguna bagi yang tidak melihat kanvas. |
| D23 | **Menerapkan itu pertunjukan, bukan penumpahan.** Operasi yang disetujui mendarat satu per satu, kursor berpindah ke tiap sasaran, tiap langkah punya kalimat dan bunyinya sendiri. | Bedanya dengan Trido: mereka bertindak tanpa bertanya, kita bertanya dulu baru bertindak. Dan tiga operasi jadi tiga kalimat yang bisa diikuti pembaca layar, bukan satu "3 simpul ditambahkan" yang tidak menyebut di mana. |
| D34 | **Menyeret satu simpul ke atas simpul lain mengusulkan pemindahan.** Simpul tujuan ditandai selama seret, dan lepasnya membuka gerbang konfirmasi yang sudah terisi induk barunya. Tombol **Pindah** dan **Hubung** dicabut dari toolbar; `m`, `r`, dan daftar perintah tetap ada. | Merakit itu gerakan yang sudah dikuasai orang - FigJam dan draw.io memakainya, dan memindahkan sesuatu dengan menaruhnya di tempatnya lebih cepat dipahami daripada menyebut nama induk barunya di sebuah daftar. D6b utuh: tidak ada operasi yang **hanya** bisa lewat seret, jadi persona A tidak kehilangan apa pun. Gerbangnya tetap karena pindah itu perubahan struktur (aturan 8). |
| D35 | **Penempatan tangan dibuang ketika simpulnya berpindah induk.** | Penempatan itu pendapat tentang letak sebuah simpul di dalam tata letak tempat ia diletakkan. Mengganti induknya membatalkan pendapat itu persis seperti mengganti bentuk ruang membatalkannya (D31), dan simpul yang tertinggal di tempat lamanya sesudah pindah membuat kanvas berbohong tentang pohonnya. |
| D36 | **Toolbar kanvas dipangkas**: susunan "Terbelah", label simpul terpilih, tombol Pindah dan Hubung dicabut, dan tombol layar penuh jadi ikon tanpa teks. **Sakelar tema pindah ke navigasi kiri** sebagai sakelar sungguhan (`role="switch"`), di tempat yang sama pada ruang maupun dasbor. | "Terbelah" adalah pilihan ketiga untuk manfaat yang sudah diberikan panel outline. Label simpul terpilih adalah keterangan untuk sesuatu yang sedang dilihat dan sudah disorot. Ikon layar penuh sudah dikenal luas. Setiap pilihan tambahan di toolbar dibayar oleh semua orang yang harus membacanya sebelum sampai ke yang dicari. Temanya digambar sebagai rel dan knop, bukan tombol berlabel "Tampilan" dengan kata keadaan di sebelahnya: bentuk sakelar sudah menyatakan apa yang akan terjadi tanpa perlu dibaca, dan `role="switch"` menyampaikan fakta yang sama ke pembaca layar. |
| D37 | **Ruang punya dua keadaan akses: terkunci dan terbuka**, dipilih saat ruang dibuat, bawaannya terkunci. Ruang terkunci memakai **ruang tunggu ala Zoom**: kode membawa orang ke depan pintu, permintaannya muncul di panel Peserta, dijawab Terima atau Tolak di baris orangnya. | Drive menjawab permintaan akses di kotak masuk berjam-jam kemudian, dan itu tidak berguna ketika rapatnya sedang berlangsung. Zoom menjawabnya di panel peserta pada detik yang sama, jadi daftarnya duduk di sebelah orang-orang yang sudah masuk. Bawaannya terkunci karena ongkos salah pilih hanya berat ke satu arah. Permintaan itu **kehadiran, bukan dokumen** - tempatnya di kanal Awareness bersama kursor, karena ia hilang begitu orangnya menyerah menunggu. |
| D38 | **Undangan lewat surel menyiapkan draf di aplikasi surel pengguna**, bukan mengirim apa pun dari kita. Alamat yang diketik tidak pernah meninggalkan perangkat. | Mengetik alamat lalu menekan undang adalah gerakan yang sudah dikuasai semua orang dari Drive, dan tidak ada alasan mengarang gerakan baru. Yang tidak boleh ditiru adalah bagian yang menuntut akun dan server surel: keduanya menabrak janji mode kelas yang berjalan tanpa internet. `mailto:` memberi gerakan yang sama tanpa satu pun janji itu dilanggar - orangnya yang menekan kirim. Kode ruang tetap jalur utama, karena kode bisa diucapkan di tengah rapat dan tautan tidak. |
| D39 | **Hanya `KUR-482` yang membawa isi contoh.** Ruang lain dibuka dengan satu simpul akar bernama sama dengan ruangnya, dan hanya berisi satu peserta. | Ruang baru yang membuka rapat orang lain membuat seluruh alur "buat ruang" tampak rusak. Satu akar, bukan kanvas kosong: kanvas tanpa apa pun tidak punya yang bisa difokus, dibacakan, atau dijadikan sandaran kalimat pertama yang diucapkan. |
| D40 | **Alat bukan jenda mengambang, melainkan tata letak dan kulit interaksi di atas sub-pohon.** Isi sebuah alat adalah anak-anaknya sendiri; `Node.tool` cuma menyatakan cara menggambarnya. Kartu alat tetap simpul: ada di outline, ada di telusur audio, ikut undo, ikut narasi, ikut hitungan kontribusi. | Ini gagasan yang sama dengan "bentuk visual itu algoritma tata letak dari model yang sama" (bagian 2), cuma satu tingkat lebih ke bawah. Jendela mengambang ala Trido tidak punya tempat di outline maupun telusur audio, jadi persona B kehilangan benda itu seluruhnya dan klaim tiga tampilan setara mati. Konsekuensi yang menyenangkan: mematikan alat tidak menghilangkan apa pun, karena anaknya memang selalu simpul biasa. |
| D41 | **Satu skema per alat, bukan satu skema untuk semua.** Setiap alat mendaftarkan skemanya sendiri di `core/tools/registry.ts`. | Diputuskan pemilik proyek 8 September 2026, membatalkan kekhawatiran saya soal ledakan skema. Alasannya benar: ekstraktor sudah menentukan alat mana yang diminta sebelum skema dipilih, pengguna sering menyebut alatnya sendiri, dan kursor agen masih meminta konfirmasi sebelum apa pun mendarat. Skema kecil yang tepat justru yang membuat constrained decoding mendarat (bagian 8); skema besar yang memuat semua alat adalah skema yang tidak cocok untuk satu pun. |
| D42 | **Suara pada voting adalah peristiwa, bukan field.** Hitungannya diturunkan dari log dengan aturan "peristiwa terakhir per aktor menang". | Menyimpan angka berarti menulis ulang undo, atribusi, mode telaah, dan hitungan kontribusi satu per satu. Menurunkannya dari log berarti keempatnya sudah jadi sejak baris pertama. Kasus yang membuktikannya ada di data contoh: Budi mengubah pikirannya, dan penghitung yang disimpan akan salah di situ. |
| D43 | **Rel alat horizontal yang mengambang di atas kanvas**, berisi tambah simpul, hubungkan, komentar, dan tombol titik tiga yang membuka **alat dan templat**. Bentuknya meniru Trido; isinya tidak bisa. | Rel Trido berisi pena, bentuk, dan teks — aturan 3 melarang menggambar bebas, jadi tombol pena di sini adalah tombol yang menghasilkan isi yang tidak bisa dibaca outline. Yang ditiru bentuknya: rel kecil, tindakan tersering di depan, titik tiga membuka sisanya. Isinya diuji dengan satu pertanyaan: apa yang belum punya jalur tetikus. Semua tombolnya sudah punya padanan papan ketik, jadi rel ini menambah jalur, bukan memilikinya (aturan 6, D6b). Lubang yang benar-benar ditutup: templat — sebelumnya alat cuma bisa didapat dengan mengubah simpul yang sudah dibuat, dan itu cara aneh memulai retro. |
| D44 | **Templat adalah sekumpulan perintah `createNode`, bukan jenis benda ketiga.** Satu templat mendarat sebagai satu langkah undo lewat `dispatchBatch`, tetapi tetap menulis peristiwanya satu per satu. | Enam perintah berarti enam kali `Ctrl+Z` untuk membatalkan satu gerakan, dan itu bukan "dapat dibatalkan" dalam arti yang dikenali orang (aturan 8). Log tetap enam baris karena aturan 5 soal catatan; yang diumumkan cuma satu kalimat, dan meredam ledakan itu memang tugas D7. Kalimat undo ikut diperbaiki: membatalkan batch menyebut jumlahnya, bukan menyebut satu dari enam yang kebetulan terakhir. |
| D45 | **Yang dibangun sekarang sambungannya, bukan mesinnya.** `plan(ucapan, konteks) → Plan` sudah berbentuk sungguhan; isinya masih pencocok kata kunci. | Bagian 14: tenggat terdekat adalah tampilan yang bisa dilihat dan diklik. Nilai demonya identik — penilai melihat lingkaran penuhnya jalan — sementara ASR dan Ollama sungguhan adalah tempat waktu habis dan tempat panggung gagal (unduh model, WebGPU, mode kelas tanpa internet). Karena semua yang di hilir cuma membaca `Plan`, model sungguhan nanti masuk sebagai satu badan fungsi, bukan tulis ulang. |
| D46 | **Tiga jalur berurutan, dan satu rem.** (1) alat disebut langsung, (2) alat tersirat dari bentuk kalimat pada keyakinan rendah, (3) isi biasa ke penyusun struktur. Dua alat dalam satu kalimat = bertanya, bukan memilih. | Yang murah dan pasti harus menang atas yang pintar dan ragu: permintaan yang menyebut alatnya tidak boleh dicincang jadi simpul lepas oleh pengurai yang cuma mencari kata benda. Keyakinan jalur 2 sengaja di bawah 0.6 supaya ditandai perlu dilihat. Rem-nya bagian 8: sistem tidak pernah menebak di kanvas milik bersama. |
| D47 | **Multi-agent berarti pipeline yang diberi nama**, bukan kawanan agen. Penyusun struktur, pemilih alat, perapi judul — tiap baris usulan membawa nama tahapnya, dan panel menampilkan alasan perutean serta **isi konteks yang dikirim ke model** apa adanya. | Jawaban yang tidak menyebut asalnya cuma bisa diterima atau diabaikan seluruhnya; jawaban yang menyebut tahapnya bisa dibantah pada bagian yang salah saja. Menampilkan konteksnya membuat janji bagian 8 bisa diperiksa, bukan cuma diucapkan: yang dikirim itu struktur, bukan tangkapan layar, dan tidak ada audio. "Percaya saja" bukan fitur aksesibilitas. |
| D48 | **Ollama sungguhan dipasang di balik sambungan yang sama**, dengan `qwen2.5:7b` dan constrained decoding berskema JSON. Pencocokan aturan tetap bawaan; Ollama dipilih sadar di Pengaturan. | Membuktikan D45 alih-alih menjanjikannya: yang berubah cuma satu implementasi `PlanProvider`, tidak ada berkas hilir yang tersentuh. Pencocokan aturan tetap bawaan karena mode kelas harus jalan tanpa apa pun terpasang. **Model gagal tidak pernah jadi cadangan diam-diam** — hasilnya turun ke pencocokan aturan dan kalimat alasannya menyebutkan kegagalan itu, karena demo yang tampak seperti model lokal padahal bukan adalah kebohongan yang paling mudah dibuat. |
| D49 | **Model memilih rute dan judul; kode yang menyusun perintah.** Model tidak pernah mengeluarkan id simpul, koordinat, atau perintah langsung. | Perintah dibangun dari registry templat, jadi field yang dihalusinasikan tidak bisa jadi dokumen rusak. Model punya pendapat; kode memegang aturan. Ini juga yang membuat aturan 1 dan 2 aman dari model: keduanya tidak pernah berada dalam jangkauan keluarannya. |
| D50 | **Transkrip tampil di semua halaman selama merekam**, termasuk di kanvas, dan bisa dilipat. Sebelumnya disembunyikan di kanvas karena kursor agen dianggap cukup. | Tidak cukup: kursor menyebut apa yang akan **dikerjakan**, transkrip menyebut apa yang **didengar**, dan di celah antara keduanya itulah salah dengar bersembunyi. Begitu usulan berdiri, kanvas menyerahkan tugasnya kembali ke kursor. |
| D51 | **Rel alat dilebur ke dalam toolbar kanvas — satu kartu, satu baris.** Panelnya di-portal ke body. | Dua kartu mengambang bertumpuk di sudut yang sama adalah dua benda yang harus dilewati sebelum sampai ke papan, dan papan itu yang orang datangi (D25). Di-portal karena toolbar menggulir menyamping di jendela sempit dan akan memotong menunya sendiri. |
| D52 | **Daftar penyedia pakai tombol ber-`role="radio"`, bukan radio native.** | Grup radio terkendali yang sebagian anggotanya nonaktif berebut dengan React soal mana yang dianggap tercentang oleh DOM, dan yang kalah adalah orang yang mengklik. Semantik pembaca layar tetap utuh tanpa memberi suara pada pengelompokan bawaan peramban. |
| D53 | **Templat selalu mendarat berdiri sendiri**, sebagai akar tersendiri di ruang, tidak menempel ke simpul yang kebetulan terfokus. Kalau memang mau menempel, seret kartunya ke simpul itu. | Voting atau papan retro biasanya urusannya sendiri. Menguburnya di bawah apa pun yang kebetulan terpilih membuat outline membacakan hubungan yang tidak pernah dimaksudkan siapa pun — dan outline yang berbohong soal struktur lebih berbahaya daripada kanvas yang berantakan, karena persona B cuma punya outline. Aturan 1 utuh: kartu yang berdiri sendiri tetap simpul dengan tepat satu induk, dan induknya ruang. Sempat ada pilihan "di bawah X / berdiri sendiri", dicabut: satu keputusan tambahan sebelum orang bahkan memilih templatnya, untuk kasus yang lebih jarang, sementara gerakan seret sudah menyelesaikannya. |
| D54 | **Tinggi kartu diukur, bukan ditebak.** Kanvas mengukur apa yang sudah digambar lalu menyerahkan angkanya ke tata letak; tidak ada yang menetapkan tinggi eksplisit, jadi pengukuran tidak mengejar ekornya sendiri. | `NODE_H` cuma tinggi kartu terpendek yang mungkin. Setiap judul yang membungkus dua baris atau kartu yang membawa lencana diam-diam menimpa saudaranya di bawah — bug yang sudah ada sejak awal dan baru kelihatan ketika kartu alat yang jauh lebih tinggi masuk. Menebak tinggi dari isi bisa saja, tapi tebakan akan melenceng lagi pada isi berikutnya. |
| D55 | **Setiap akar punya pita sendiri di bagan kolom, dan kolomnya menumpuk kumulatif.** | Dulu semua akar ditaruh di titik yang sama dan lebar kolom dikali indeks. Keduanya tidak kelihatan selama satu ruang cuma punya satu pohon dan semua kartu selebar sama; keduanya langsung salah begitu templat boleh berdiri sendiri dan kartu alat lebih lebar. Diverifikasi dengan menghitung tumpang tindih di kelima bentuk: nol. |
| D56 | **Palet perintah `Ctrl+K` dibangun**, berisi setiap perintah, alat, templat, bentuk, perpindahan halaman, dan sakelar tampilan — disusun dari registry, bukan diketik satu per satu. | Pintasannya sudah diiklankan di lembar `?` dan di `docs/keyboard-map.md` sejak awal, dan tidak melakukan apa-apa. Bagi orang yang menavigasi dengan papan ketik, lembar itu adalah kontrak, dan satu-satunya entri yang menjanjikan "semua perintah" justru entri yang berbohong. Tidak ada kemampuan baru di dalamnya: semua sudah punya tombol atau tuts. Palet ini cuma jalan menuju yang tutsnya belum dihafal — persis yang diminta aturan 6. Disusun dari registry supaya templat yang ditambah besok muncul sendiri. |
| D57 | **Dua tingkat kecocokan, tanpa skor.** Cocok-substring dulu, lalu cocok-subsequence, urutan registry tidak diubah di dalam tiap tingkat. | Subsequence saja menaruh "Tambah langkah" di atas "Buka kanvas" untuk kata "buka" — cocok secara teknis, tidak berguna sebagai hasil pertama. Skor relevansi sengaja tidak dipakai: palet yang menyusun ulang dirinya dengan pintar adalah palet yang entri keduanya bergeser saat tangan sudah bergerak ke sana, dan ingatan otot itu sebagian besar alasan palet layak ada. |
| D58 | **Perintah yang tidak bisa dijalankan tetap terdaftar beserta alasannya**, bukan disembunyikan. | Alasan yang sama dengan D24. Daftar yang menyembunyikan apa yang tidak bisa dilakukannya mengajarkan bentuk produk yang keliru, dan "Pilih simpul dulu" jauh lebih berguna daripada entri yang lenyap tanpa penjelasan. |
| D59 | **Retro dan matriks dampak-usaha digambar sebagai alat sungguhan**, bukan cuma templat: tiga kolom dan kisi 2x2, masing-masing selnya simpul kelompok. Tiap alat mendaftarkan lebarnya sendiri di registry. | Satu alat cuma membuktikan tesis "alat = tata letak di atas sub-pohon" sekali, dan sekali itu gampang dibilang kebetulan. Tiga membuktikannya sebagai pola. Lebar didaftarkan karena tinggi bisa diukur setelah dilukis (D54) tapi lebar harus diputuskan sebelumnya — retro tiga kolom tidak bisa disimpulkan dari isinya. |
| D60 | **Kuadran dan kolom membawa `data-node-id`, jadi menjatuhkan simpul ke dalamnya mereparent tanpa kode tambahan.** | Uji-tumbuk seret sudah mencari `[data-node-id]` terdekat. Gerakan merakit yang dibangun untuk pohon langsung bekerja di dalam kartu — dan itu bisa terjadi justru karena kuadran benar-benar induk, bukan wilayah di layar. Inilah bukti paling jelas bahwa aturan 2 itu keunggulan: di Miro, memindahkan kartu ke kuadran lain tidak menghasilkan apa pun yang bisa dibacakan; di sini menghasilkan satu kalimat. |
| D61 | **Tombol pilih di outline cuma muncul di bawah alat voting**, bukan di bawah alat mana pun. | Kolom retro dan kuadran matriks juga alat. Menawarkan "pilih" pada isinya adalah kontrol yang tidak melakukan apa-apa — lebih buruk daripada kontrol yang tidak ada. |
| D62 | **Set uji orchestrator, 22 kasus, dua penyedia** (`npm run eval`, `npm run eval -- --ollama`). Dibundel dengan esbuild yang sudah ikut vite, tanpa dependensi baru. | Menyetel prompt tanpa ini itu menebak: satu kalimat diubah, satu kasus yang kebetulan dicoba membaik, dan tiga yang lain memburuk tanpa ketahuan. Model 7B persis ukuran di mana itu terjadi diam-diam. Tanpa dependensi baru karena mode kelas berjanji jalan tanpa jaringan — perintah uji yang butuh install adalah perintah uji yang tidak dijalankan orang pada hari ia dibutuhkan. Terbayar pada jalannya yang pertama: tiga positif palsu ketahuan. |
| D63 | **Kata pemicu tidak boleh kata sehari-hari, dan nama saja bukan permintaan.** "suara" dan "prioritas" dicabut sebagai pemicu tunggal; nama templat baru dianggap permintaan bila didahului kata permintaan. | "Suara mahasiswa di survei kemarin cukup jelas" bukan permintaan pemungutan suara, dan "catat bahwa retro kemarin sudah kita bahas" bukan permintaan papan retro. Perute yang menyela rapat lebih buruk daripada yang diam, karena menyela itu ongkos yang dibayar semua orang di ruangan. |
| D64 | **Rem ada di kode, bukan di prompt; aturan jadi lantai, model jadi jangkauan.** Dua nama dalam satu kalimat diperiksa sebelum model ditanya, dan nama yang jelas disebut mengalahkan jawaban "susun" dari model. | Set uji menunjukkan model mengabaikan instruksi ambiguitas: 0/2. Aturan keselamatan yang bergantung pada model 7B mengingat satu baris prosa bukan aturan keselamatan. Sesudah remnya dipindah ke kode: 2/2, dan totalnya naik dari 13/22 ke 17/22. Angka model ditulis apa adanya di `docs/agent.md` — dia sempurna pada negatif dan lemah pada positif, dan untuk kanvas bersama itu arah salah yang benar. |
| D65 | **Suara sungguhan: Whisper lewat transformers.js di Web Worker**, WebGPU bila ada dan WASM bila tidak, `whisper-base` bawaan dan `whisper-small` sebagai pilihan. Mikrofon dibuka lewat AudioWorklet hanya selama sakelar bicara menyala; transkrip sementara mengalir tiap ~1,2 detik dan dilewati, bukan diantrekan, bila Worker masih sibuk. Model diunduh saat pertama kali menekan Bicara, bukan saat ruang dibuka. Ucapan contoh tetap tersedia sebagai pilihan di Pengaturan. | Pemilik proyek memprioritaskan fitur suara di atas uji otomatis, 14 September 2026. Ini persis tumpukan bagian 8 dan D3, jadi tidak ada keputusan tumpukan baru. Mengunduh 80 MB diam-diam hanya karena orang membuka ruang adalah ongkos yang tidak diminta; menunggu pada kalimat pertama lebih jujur, dan audionya tetap terekam selama menunggu. Transkrip sementara yang diantrekan akan tertinggal di belakang pembicara, dan itu lebih buruk daripada jarang diperbarui. Diukur di peramban ini: 6 detik audio, sekitar 1 detik di WebGPU sesudah pemanasan. VAD belum; "sedang bicara" tetap diambil dari sakelar (D4). |
| D66 | **Tahap penyusun struktur sungguhan**, menggantikan kalimat kalengan: tambah (satu atau daftar), ubah judul, pindah, hapus, hubungkan. Dua implementasi di balik satu kontrak — pencocok aturan dan Ollama berskema JSON — dan model hanya menyebut simpul **dengan judul**; kode yang mencocokkannya ke id. | D49 berlaku satu tingkat lebih ke bawah. Judul yang tidak ditemukan tidak pernah jadi simpul karangan: langkahnya diberi keyakinan rendah atau ucapannya dikembalikan sebagai teks. Aturan tetap lantai: model yang gagal atau tidak menemukan apa pun jatuh ke pencocok aturan, dan alasannya menyebut itu (D48). |
| D67 | **Perapi judul benar-benar dijalankan.** Judul hasil ucapan yang melewati 60 karakter dipotong di batas klausa, kalimat utuhnya jadi `note`, dan barisnya diberi label tahap "Perapi judul". | Sebelumnya nama itu ada di `AGENTS` tanpa pernah dipanggil — kebohongan kecil di panel yang justru dibuat untuk jujur soal asal usulan. Ucapan hampir selalu lebih panjang dari ketikan, dan menolak kalimat karena aturan 4 memaksa persona A mengulangnya (D1). |
| D68 | **Perintah bisa diketik di panel pemeriksaan**, lewat fungsi pemahaman yang sama persis dengan ucapan, termasuk menjawab usulan dengan "ya" atau "batal". Jalur masukan yang tercatat mengikuti pintunya: ketikan tercatat papan ketik, bukan suara. | Aturan 6 untuk asisten itu sendiri: orang tanpa mikrofon, atau di ruangan yang tidak boleh berisik, tetap harus sampai ke orchestrator. Satu fungsi untuk dua pintu membuat kalimat yang diketik dan diucapkan mustahil dipahami berbeda. Atribusi yang mengaku "suara" untuk ketikan membuat ringkasan kontribusi berbohong (D8). |
| D69 | **Karsa bisa berbahasa Indonesia dan Inggris**, dengan dua pilihan terpisah: bahasa keluaran (narasi, usulan, pengumuman, label domain) dan bahasa ucapan (Otomatis, Indonesia, English). Bawaannya Indonesia. Kedua bahasa ditulis berdampingan di tempat kalimatnya dibuat (`tr(id, en)`), bukan lewat katalog kunci. Judul simpul tidak diterjemahkan. Pembaca aturan, orchestrator, jawaban ya/tidak, dan prompt model mengerti kedua bahasa; set uji bertambah lima kasus berbahasa Inggris. | Diminta pemilik proyek 14 September 2026, **mengubah baris pembuka dokumen ini** yang menyatakan antarmuka berbahasa Indonesia. Dua pilihan karena bahasa yang diucapkan dan bahasa yang paling nyaman didengar tidak selalu sama. Katalog kunci memungkinkan kalimat baru ditambah dalam satu bahasa dan terlupa di bahasa lain tanpa ketahuan; ditulis berdampingan, lupa itu kelihatan di baris yang sama. Bahasa adalah preferensi perangkat, tidak masuk dokumen: dua orang di ruang yang sama boleh mendengar perubahan yang sama dalam dua bahasa, karena maknanya ada di struktur. Bawaan tidak mengikuti peramban karena banyak peramban di sini berbahasa Inggris. **Belum:** sebagian besar teks halaman (navigasi, dialog, dasbor) masih Indonesia, dan isi templat masih Indonesia. |
| D70 | **Model menjadi orchestrator utama; pencocokan kata kunci turun jadi rem dan cadangan.** Satu panggilan model memutuskan seluruh arti kalimat — alat, susun, tanya, atau bukan perintah — menggantikan dua panggilan (rute lalu penyusun). Ollama jadi penyedia bawaan. Yang tetap di kode: rem dua alat, nama alat yang didahului kata permintaan langsung dipakai, simpul yang ditunjuk harus disebut dalam ucapan, alat yang tidak disebut dan tidak tersirat hanya boleh **ditawarkan sebagai pertanyaan**, dan konteks kini membawa daftar "baru saja" untuk "yang tadi". | Diminta pemilik proyek 14 September 2026: kata kunci "terlalu hardcoded". Uji 26 gaya bicara membuktikannya — aturan mengerti 6, dan tiga di antaranya salah dengan keyakinan 88–90 persen. Setiap penjaga di kode lahir dari satu kegagalan yang tertangkap uji: model mengusulkan menghapus simpul yang tidak disebut; model menjawab "bikin voting" dengan pertanyaan 7 dari 7 kali; model mengubah "tambahkan ide" dan "catat sebagai keputusan" menjadi voting. Model punya jangkauan; kode tetap memegang apa yang tidak boleh ditebak (D49, D64). Ongkosnya waktu: 6–12 detik per kalimat di mesin ini, dan itu yang berikutnya harus turun. |
| D71 | **Kalau tidak jelas, asisten bertanya — dengan pilihan bernomor dan jalan keluar bebas.** Pertanyaan tampil sama di kursor agen, dock, dan panel (`QuestionCard`). Tiap pilihan membawa perintahnya sendiri, dan **memilih itu konfirmasinya**. Jawaban bisa klik, sebut nomor atau kata pilihan ("yang kedua"), "batal", atau kalimat bebas lewat suara atau ketikan yang dikirim kembali ke model **bersama pertanyaan dan kalimat awalnya**. Pilihan dibacakan dengan nomornya. Pertanyaan dengan satu jawaban nyata diperlakukan sebagai usulan biasa. Opsi di skema dibuat datar (satu opsi satu operasi). | Bagian 8: sistem tidak menebak di kanvas bersama — tapi "tidak menebak" yang cuma menampilkan teks mentah membuat orang harus mengulang dari nol. Pilihan pendek membuat jawabannya murah; jalan bebas memastikan tidak ada orang yang terjebak di antara pilihan yang semuanya salah. Nomor karena jawaban lisan butuh sesuatu untuk ditunjuk yang tidak bergantung pada melihat letak tombol. Memilih langsung menerapkan karena menambah Terapkan sesudah memilih berarti bertanya dua kali untuk satu keputusan, dan tetap bisa dibatalkan. Opsi datar karena opsi bersarang selalu kembali kosong dari model 7B. Pertanyaan satu jawaban dilipat karena bertanya itu ongkos bagi semua orang di rapat. |
| D72 | **Yang berbeda antar pemasangan jadi konfigurasi dua lapis, bukan konstanta.** `.env` (`VITE_*`) menentukan bawaan saat membangun; halaman Pengaturan mengubahnya per perangkat tanpa membangun ulang; keduanya dibaca lewat satu berkas `src/core/config.ts`. Yang pertama dipindahkan: alamat dan nama model Ollama, serta dua model Whisper. **Aplikasi boleh disajikan dari server sementara modelnya tetap di `localhost` masing-masing pendengar**, dan pemeriksaan koneksi menyebut penyebab kegagalannya satu per satu: halaman https ke alamat http, asal ditolak Ollama (`OLLAMA_ORIGINS`), model belum di-`pull`, atau tidak terjangkau. | Pemilik proyek menunjuk nilai yang di-hardcode, 16 September 2026, sekaligus menyatakan rencana men-deploy. Keduanya satu jawaban: mode kelas (bagian 7) dan pemasangan ter-deploy adalah **kode yang sama dengan konfigurasi berbeda**, jadi yang membedakan keduanya wajib berupa konfigurasi. Dua lapis karena dua orang yang berbeda mengubahnya: institusi mengatur `.env` sekali saat membangun, sedangkan satu peserta rapat menunjuk Ollama miliknya sendiri lewat antarmuka. Pesan gagal dipecah empat karena "tidak terjangkau" adalah empat masalah dengan empat perbaikan berbeda, dan yang paling sering terjadi di mode ter-deploy justru yang paling tidak kelihatan: peramban memblokir panggilan ke mesin lokal, atau Ollama menolak asal halaman. |
| D73 | **Batas lapisan dijaga skrip, dan `core/` punya uji.** `core` hanya boleh mengimpor `core` (satu pengecualian: tipe dari `ui/icons`), `store` hanya `core`; `scripts/check-boundaries.mjs` menolak selain itu. Kosakata domain dan bahasa pindah ke `core/vocabulary.ts` dan `core/i18n.ts`; hook React-nya tinggal di `ui/useLang.ts`; runner eval keluar ke `src/eval/`. Uji ditulis di sebelah kodenya (`*.test.ts`), dijalankan `node --test` lewat esbuild, tanpa kerangka uji. `npm run check` menjalankan semuanya. | Telaah kode 16 September 2026 menemukan 14 impor dari `core` ke lapisan antarmuka, yang saya tambahkan sendiri sehari sebelumnya tanpa ada yang melarang. Batas yang hanya ditulis di dokumen dilanggar pada hari pertama ada tenggat. Uji pertama sengaja menyasar yang disebut MATI: aturan 1 (siklus, termasuk pemulihan yang sama di semua urutan), aturan 4, aturan 5 untuk **setiap** jenis peristiwa dalam dua bahasa (`satisfies Record<EventType, true>` membuat jenis baru tanpa kalimat jadi galat kompilasi), satu pintu data, dan D42. Diverifikasi dengan membalik satu baris di `tally.ts`: ujinya gagal. |
| D74 | **Alur suara satu orang jadi modul TypeScript biasa (`features/voice/flow.ts`), bukan kumpulan `useRef` di `RoomContext`.** Keadaannya eksplisit (diam, mendengar, berpikir, siap, menerapkan), ketergantungannya disuntikkan (mikrofon, model, penulis perintah, narator, jam), dan React hanya berlangganan lewat `useSyncExternalStore`. **Permintaan terbaru menang:** setiap permintaan baru, pembatalan, atau tekan Bicara menaikkan nomor giliran, dan jawaban model untuk nomor lama dibuang. Antarmuka `useRoom()` tidak berubah, jadi tidak ada komponen yang disentuh. | Telaah kode 16 September 2026: `RoomContext` 1.056 baris dengan 18 `useRef`, sebagian besar untuk menambal ketergantungan melingkar antar fungsi suara, dan satu bug balapan nyata (jawaban model lama bisa menimpa permintaan yang lebih baru). Sesudahnya 779 baris dan 3 `useRef`; alur punya 17 uji di Node tanpa mikrofon, Ollama, maupun React, dan membuang pengaman balapan membuat dua ujinya gagal. **Satu kegagalan hanya tertangkap di peramban:** objek `announcer` berganti setiap kali ada pengumuman, dan alur yang dibuat ulang karenanya kehilangan keadaan di tiap aksi. Sekarang dibaca lewat satu ref "nilai terkini" yang sama dengan `run`, fokus, dan penyedia. Dicatat supaya pelajarannya tidak hilang: uji unit membuktikan logika, bukan sambungannya ke React. |
| D75 | **Dokumen ruang kini Yjs (`YjsDocStore`), disimpan di IndexedDB dan tersinkron antar tab.** `applyCommand` tetap satu-satunya hakim: perintah diterapkan pada snapshot biasa, lalu hanya selisihnya ditulis ke Yjs dalam satu transaksi. Simpul disimpan sebagai peta per field. Undo memakai `Y.UndoManager` yang hanya melacak transaksi perangkat ini; log di luar cakupannya. Setiap perangkat punya id aktor acak sendiri. Peristiwa yang datang dari perangkat lain diumumkan dan dibunyikan persis seperti milik sendiri, kecuali yang lebih tua dari 15 detik saat ruang dibuka. `MemoryDocStore` dicabut. | Tahap a kolaborasi, 17 September 2026. Empat hal di kode lama yang akan rusak begitu dua orang masuk: semua orang beridentitas `a_anda`; undo snapshot membatalkan kerja orang lain yang datang sesudahnya; perubahan orang lain tidak dinarasikan sama sekali, padahal mengikutinya adalah klaim inti (bagian 1); dan muat ulang menghapus rapat. Selisih ditulis dari snapshot supaya `core/` dan seluruh ujinya tidak berubah. Peta per field supaya ganti judul dan pindah induk bersamaan sama-sama bertahan (D9). Riwayat lama tidak dibacakan karena membuka ruang menarik seluruh sejarahnya. **Risiko diterima:** dua perangkat yang membuka ruang baru pada saat yang sama sama-sama menulis peristiwa akar; id tetap membuat simpulnya menyatu, tetapi log bisa punya dua baris. Server yang menyemai ruang (tahap b) menutupnya. **Diputuskan untuk tahap b/d:** room service memakai NestJS, dengan Hocuspocus dipasang di proses yang sama, karena ada sekitar delapan endpoint beserta token dan ruang tunggu, dan pemilik proyek ingin jalur skala yang jelas. |
| D76 | **Server satu proses: NestJS sebagai room service, Hocuspocus dipasang di server HTTP yang sama pada `/sync`, dokumen di SQLite bawaan Node (`node:sqlite`).** Server juga menyajikan `dist/`, jadi mode kelas cukup satu alamat. Klien menyambung lewat `VITE_SYNC_URL` (bawaan `/sync`, asal halaman; `off` = hanya perangkat ini); di pengembangan Vite meneruskannya. Ruang baru disemai sesudah IndexedDB dan server menjawab, atau sesudah 3 detik tanpa server. Nama ruang yang bukan berbentuk kode ditolak sebelum menyentuh disk. **Belum ada token:** siapa pun yang tahu kodenya bisa menyambung (tahap d). | Tahap b kolaborasi, 17 September 2026. SQLite bawaan dipilih karena modul native adalah bagian pemasangan Node yang paling sering gagal di Windows dan image ramping; bayarannya satu flag `--experimental-sqlite` di Node 22.6. Sinkronisasi dipasang di samping modul Nest, bukan di dalamnya, supaya bisa dipisah ke proses sendiri tanpa menulis ulang (tahap 2 `architecture.md`). Menunggu server sebelum menyemai mencegah perangkat kedua menulis akar kedua ke ruang yang sudah ada. **Diverifikasi:** `npm run smoke:sync` (dua klien, tersimpan untuk klien ketiga, nama tidak sah ditolak); di peramban, perubahan dari klien Node sampai dan diumumkan dengan nama pengirimnya, isi bertahan saat server dinyalakan ulang, dan simpul yang dibuat saat server mati sampai sesudah tersambung lagi. Satu bug tertangkap di situ: nama pengirim yang datang dalam pembaruan yang sama terbaca "Seseorang", karena narasi membaca aktor dari render sebelumnya. |
| D77 | **Struktur folder per lapisan: `app/` (rute + halaman), `components/` (UI per fitur, `shared/` untuk yang dipakai bersama), `state/` (provider + hook), `services/` (logika tanpa React), lalu `store/` dan `core/`.** `RoomContext` dipecah jadi lima provider menurut alasan berubahnya — `useDocument`, `usePresence`, `useView`, `useSession`, `useAssistant` — dan `useRoom` dicabut. 14 dialog jadi satu berkas masing-masing; `DialogProvider` hanya menyimpan dialog mana yang terbuka. `RoomShell` dipecah jadi `TopBar`, `Sidebar`, `useGlobalShortcuts`, dan `usePaletteRoom`. Dokumen tidak lagi menyentuh navigasi: `run` hanya menulis, dan `ViewProvider` mendengar peristiwa perangkat ini (`subscribeApplied`) untuk memfokus simpul baru dan membuang penempatan tangan (D35). Setiap folder di `components/`, `state/`, dan `services/` punya `README.md` pendek — isi, taruh di sini, bukan di sini, tabel file — dan skrip batas menolak folder tanpa README atau tabel yang menyebut file yang tidak ada. | Diminta pemilik proyek 17 September 2026: `RoomContext` 812 baris, `DialogContext` 728, `RoomShell` 509, dan tidak modular. Struktur `components/` + `shared/` diusulkan pemilik proyek; README per folder juga, supaya orang tahu ke mana komponen baru harus pergi. Satu `useRoom` dengan ±80 field membuat 18 komponen render ulang untuk setiap kata transkrip; lima konteks membatasinya ke yang memang membaca bagian itu. Tabel README diperiksa skrip karena catatan yang tidak diperiksa basi pada perubahan pertama. **Satu bug tertangkap di peramban:** telusur audio macet di simpul pertama, karena efeknya bergantung pada objek `announcer` (berganti tiap pengumuman) dan fokus, sehingga dimulai ulang dari simpul yang difokus di setiap langkah -- jebakan yang sama dengan D74, dan kodenya sudah begitu sebelum pemecahan. Kini semua yang dibaca telusur lewat satu ref dan efeknya hanya bergantung pada `traversing`; tiap simpul terdengar sekali, lalu selesai. |
| D78 | **Kehadiran sungguhan lewat Yjs Awareness** (`store/presence.ts`). Tiap perangkat menyiarkan satu keadaan kecil — id aktor, nama, hue, bicara, fokus, tunjuk, mode — sebagai id, tidak pernah koordinat; kiriman dibatasi ±10× per detik sementara baris diri sendiri berubah seketika. Satu orang dengan dua tab dihitung satu. Awareness dibuat **per sambungan**, bukan per ruang, karena provider server menghancurkannya saat putus. Orang lain yang bergabung, keluar, atau menunjuk mendapat satu kalimat dan earcon baru (`peerJoined`, `peerLeft`, `peerPointed`); mulai bicara tidak dinarasikan, cukup cincin avatar. Orang yang sudah ada saat tersambung tidak diumumkan satu per satu. **Peserta contoh KUR-482 dicabut** dari kehadiran; nama mereka tetap sebagai penulis di dokumen. Chip **Tersambung / Menyambung / Luring** berdiri di sebelah "Lokal" dengan ukuran yang sama, dan sambung ulang mundur sampai 30 detik. | Tahap c kolaborasi, 17 September 2026; pemilik proyek memilih mencabut peserta palsu, karena menampilkan orang "hadir" yang tidak ada menggerogoti fitur yang dibuat untuk memberi tahu siapa yang benar-benar ada. Narasi dibuat sehemat mungkin karena aturan 9: kedatangan dan tunjukan mengubah rujukan "yang ini", mulai bicara tidak. Chip sambungan ada karena tanpa itu orang tidak tahu perubahannya sudah sampai ke rekan atau masih tertahan di perangkat. **Diverifikasi:** 8 uji Node (dua perangkat, dua tab satu orang, urutan bergabung–menunjuk–keluar, tidak mengumumkan yang sudah ada, kiriman dibatasi, putus = luring); di peramban bersama klien Node sungguhan, kedatangan tiga kali berturut-turut tertangkap pada detiknya, status bicara tampil, dan chip berubah saat server dimatikan dan kembali 4 detik setelah hidup. Ruang tunggu tetap contoh sampai token ada (tahap d). |
| D79 | **Room service sungguhan: ruang, token masuk, dan ruang tunggu di server.** NestJS menyediakan membuat ruang, info, daftar kode, ganti akses, masuk, mengetuk, cek status, berhenti menunggu, daftar ketukan, dan jawab — divalidasi `ValidationPipe`, didokumentasikan OpenAPI di `/api/docs`. Token HMAC berisi ruang, aktor, dan masa berlaku 30 hari; sinkronisasi menolak sambungan tanpa token yang cocok dengan ruangnya. Ruang terbuka langsung memberi token; ruang terkunci memberi nomor antrean, yang menunggu mengecek tiap 2 detik, dan **semua anggota** boleh menerima. Ketukan disimpan di memori server, bukan disk (D37), dan anggota di dalam ruang langsung tahu lewat pesan tanpa-isi dari Hocuspocus. **Server yang menyemai setiap ruang**, dengan kode klien yang sama (`core/` dan `store/` dibundel esbuild ke server), dan perangkat tidak pernah menyemai ruang milik server — menulis sebelum ruang termuat ditolak. `KUR-482` disemai server saat menyala, terbuka. Ruang palsu dan ketukan palsu dicabut. Klien: `RoomGate` menahan ruang sampai ada token; pintu ruang (`RoomDoor`) menampilkan memeriksa, menunggu, ditolak, atau tidak ada; token yang ditolak sinkronisasi dilupakan dan orangnya kembali ke pintu. Tanpa server semuanya tetap lokal. | Tahap d kolaborasi, 17 September 2026; pemilik proyek memilih mencabut data palsu, semua anggota boleh menerima (tanpa akun, "pembuat ruang" hilang begitu ganti perangkat), token 30 hari, dan OpenAPI. **Batas yang diterima:** token di `localStorage`; token tidak bisa dicabut sebelum kedaluwarsa; ketukan hilang bila server dinyalakan ulang; batas ketukan per alamat IP di memori. **Diverifikasi:** 12 uji terhadap server sungguhan (`npm run test:server`), dan membuang pemeriksaan token di sinkronisasi membuat ujinya gagal; di peramban bersama klien Node: menunggu di pintu lalu diterima, mengetuk dari luar lalu diterima dari panel dengan kalimatnya, token rusak kembali ke pintu, membuat ruang lewat dasbor, KUR-482 terbuka. **Satu bug tertangkap di peramban:** pindah langsung antar ruang sempat membuka ruang baru dengan status "masuk" milik ruang lama; jawaban gerbang kini terikat pada ruangnya. |
| D80 | **Mode Menyimak: mikrofon boleh tetap terbuka, dan yang menjaganya bukan sakelar melainkan nama.** Silero VAD di Worker sendiri memutuskan di mana satu kalimat berakhir; tiap kalimat yang selesai dibaca `trigger.ts`, dan hanya yang diawali "Karsa" yang jadi permintaan. Sisanya ditampilkan sebagai "terdengar, tidak dikerjakan" — bukan dibuang diam-diam. Mati secara bawaan, dinyalakan sadar, dan selama hidup ada spanduk sendiri di dock. | D4 menaruh "sedang bicara" di sakelar dan menyebut VAD selalu-hidup sebagai opsi sadar belakangan; ini opsi itu. Alasannya persona A: memakai suara justru karena menekan itu sulit, jadi menuntut satu tekanan per kalimat memindahkan hambatan yang sama ke tempat baru. Janji privasinya tidak berubah dan masih satu kalimat — audionya ke dua Worker di perangkat ini dan tidak ke mana-mana lagi. Yang berubah adalah siapa yang memutuskan kalimat dimulai. Kata pemicu wajib karena tanpa itu "kita hapus saja bagian itu" akan menghapus sesuatu, dan ruang yang menyunting dirinya sendiri karena obrolan biasa lebih buruk daripada ruang tanpa suara sama sekali. Nama saja tidak cukup jadi perintah: "Karsa" sendirian itu orang memanggil, bukan menyuruh. |
| D81 | **Mode kelas menyajikan modelnya sendiri, termasuk runtime-nya.** `npm run models` mengunduh Whisper dan Silero sekali; server menyajikannya di `/models`; `VITE_MODEL_URL=/models` mengarahkan perangkat ke sana. Berkas `.wasm` ONNX Runtime disalin dari `node_modules` ke `public/ort/` saat `dev` dan `build`. | Bagian 7 menjanjikan satu kontainer di laptop pengajar tanpa internet sama sekali, dan janji itu tidak benar: `asr.worker.ts` menyetel `allowLocalModels = false` sehingga model selalu diambil dari CDN Hugging Face. Diperbaiki, lalu ketahuan ada lubang kedua yang lebih tersembunyi — transformers.js menyetel `wasmPaths` ke cdn.jsdelivr.net, jadi sebuah ruang bisa punya seluruh berkas model di servernya sendiri dan tetap tidak mendengar apa pun, karena yang membaca berkas itu diambil dari seberang internet. Dua lubang, satu janji. |
| D82 | **Papan tunggal yang ditawarkan tanpa diminta dan ditolak, tidak ditawarkan lagi di sesi itu.** Yang disebut namanya tetap dikerjakan. Ditandai per perangkat di `VoiceFlow`, tidak masuk dokumen. | Menyela itu ongkos yang dibayar semua orang di ruangan (D63), dan menawarkan hal yang sama sesudah ditolak adalah asisten yang berdebat. Hanya tawaran yang **tidak diminta** yang didiamkan: menolak sebuah usulan itu jawaban atas satu kalimat, bukan larangan atas sebuah kata. Per perangkat karena penolakan itu fakta tentang satu percakapan, dan sesi berikutnya berhak menawarkan lagi. |
| D83 | **Templat yang diusulkan digambar sebagai kartu bayangan di tempat ia akan mendarat, dan kursor agen berdiri di situ.** Bukan simpul: tanpa id di dokumen, tidak bisa difokus, tidak bisa jadi sasaran jatuh, dan `aria-hidden` karena panel draf sudah mengatakannya sebagai kalimat. | Lubang D18 yang tersisa: simpul templat belum ada saat diusulkan, jadi kursor berdiri di induknya — menandai satu-satunya simpul yang **tidak** berubah sambil tidak mengatakan apa pun tentang dua belas yang berubah. Id-nya sudah dicetak saat rencana disusun, bukan saat diterapkan, jadi kanvas bisa menggambarnya lebih dulu. |
| D84 | **Papan tumbuh ke segala arah, tidak cuma ke kanan dan ke bawah.** `ORIGIN` jadi lantai, bukan langit-langit: ruang di sisi negatif mengikuti penempatan terjauh, dan koordinat papan nol dipaku ke layar supaya diagramnya tidak melompat saat papan melebar. Ditambah tarikan tepi sungguhan saat menyeret. | `layout.width` dan `layout.height` sudah tumbuh mengikuti isi, jadi ke kanan dan ke bawah tidak pernah ada tembok; ke kiri dan ke atas ada 800 satuan lalu berhenti. Asimetri itu tidak pernah terasa karena sebelumnya orang tidak bisa membawa simpul keluar layar sama sekali. Sekaligus memperbaiki jebakan D74/D77 yang ketiga: efek "jaga fokus terlihat" bergantung pada `layout`, yang dibangun ulang tiap frame seret, jadi tiap frame memulai gulir halus baru lalu membatalkannya — terukur 20 gerakan, 20 gulir dijadwalkan dan dibatalkan. |
| D85 | **Ukuran berkas bukan patokan; jumlah alasan berubah yang jadi patokan.** `CanvasView.tsx` 1379 baris dipecah jadi delapan (676 tersisa), `speech.ts` jadi empat, `ollama.ts` jadi empat. Yang **tidak** dipecah: `icons.tsx` 413 baris, `apply.ts` 394, `flow.ts` 525 — besar karena isinya banyak, bukan karena urusannya banyak. Garis pemisah hook: awalan `use` itu kontrak pemanggilan, bukan batas urusan, jadi yang cuma menghitung tetap fungsi biasa dan bisa diuji di Node. | Telaah 19 September 2026. `CanvasView` punya delapan alasan berubah dalam satu berkas, dan `aria-label` yang menentukan apa yang terdengar pembaca layar terkubur sepuluh tingkat indentasi di tengah `return` 522 baris — rule 6 menjadikan teks itu isi, bukan detail. Hasil sampingan yang paling berharga: `scrollToShow`, aritmetika yang menentukan apakah pengguna papan ketik bisa melihat di mana ia berada, **tidak punya satu uji pun** selama terkurung di `useCallback`; sekarang tujuh. Dua pelajaran dibayar mahal: mengangkat kartu ke komponennya sendiri membuang callback `ref` yang menghidupi pengukuran tinggi (D54) dan fokus DOM — `tsc` tidak melihatnya dan aria masih benar, jadi hanya verifikasi peramban yang menangkapnya; dan potongan yang jangkarnya bisa bergeser merusak berkas diam-diam, jadi tiap potongan diverifikasi ulang di peramban, bukan cuma dikompilasi. |
| D86 | **Kualitas pengenalan suara itu soal ukuran model, dan ukurannya jadi pilihan yang sadar.** Ditambah `whisper-large-v3-turbo` (809 juta parameter) sebagai pilihan ketiga di samping base dan small. Kuantisasi kini mengikuti ukuran: model besar dapat bobot 4-bit, model kecil dapat fp16 — kebalikan dari sebelumnya. Token keluar sambil model masih memutuskan sisanya (`WhisperTextStreamer`), dan baris transkrip hanya boleh maju, tidak pernah mundur ke teks yang lebih pendek. | Pemilik proyek menunjuk hasil yang kacau untuk kalimat Indonesia biasa, 19 September 2026: "bikin voting buat memilih prioritas semester ini" kembali sebagai "Bikna follow tingguat memiliki piroritas master". Dugaan saya soal audio bolong salah dan saya buktikan sendiri salah — osilator tanpa mikrofon menunjukkan worklet tetap ditarik pada 16 kHz. Yang tersisa cuma kapasitas model, dan jawaban jujur atas "kenapa ini lebih buruk daripada Trido" adalah bahwa mereka juga tidak menjalankan model 74 juta parameter. Presisi dibalik karena ukuran berkasnya menyatakannya dalam satu baris: decoder fp16 whisper-base 99,9 MB, decoder q4-nya 117,9 MB — bobot empat bit membayar akurasi dan tidak menghemat apa pun. Model multibahasa kecil membuang bahasa yang paling sedikit dilihatnya lebih dulu, jadi kerusakannya muncul di Bahasa Indonesia jauh sebelum muncul di Inggris. Streaming karena bagian 10 menyebut transkrip mengalir sebagai satu dari tiga penentu rasa cepat, dan itu baru separuh benar: pipeline mengembalikan satu kalimat utuh sekaligus, jadi "mengalir" berarti satu kalimat per detik dan jaraknya melebar seiring panjang ucapan. Terukur pada klip empat detik: kata pertama keluar di 662 ms, seluruh jawabannya di 838 ms. Penjaga maju-saja ada karena tiap lintasan membaca ulang buffer dari awal, jadi tanpa itu barisnya terhapus lalu diketik ulang tiap detik — terbaca rusak, bukan cepat. |
| D24 | **Halaman Pengaturan** menampilkan penyedia model yang belum dibangun dalam keadaan nonaktif, bukan disembunyikan. Baris yang penting di tiap penyedia bukan nama modelnya, melainkan **ke mana kata-katanya pergi**. | Menyembunyikan opsi yang belum jadi mengajarkan bentuk produk yang keliru. Orang berhak melihat bahwa opsi awan ada, apa harganya bagi privasi, dan bahwa ia mati. |
| D21 | Undo memakai **snapshot**, bukan perintah kebalikan. Isi mundur, **log tetap tambah-saja**, dan peristiwa yang dibatalkan dikeluarkan dari hitungan kontribusi lewat `undoneEventId`. | Dokumen sudah disalin utuh pada setiap penulisan, jadi snapshot itu tepat dan tidak bisa melenceng. Menyembunyikan pembatalan dari log berarti membuat perubahan yang tidak bisa didengar siapa pun sesudahnya. |
| D19 | Panel kanan bisa disembunyikan (`\`), kanvas bisa layar penuh (`f`), dan **fokus selalu digulirkan ke dalam pandangan**. | Tanpa itu kanvas terbuka pada tepi atas dan bukan pada akar, dan menelusuri pohon besar dengan panah membuang cincin fokus keluar layar. |
