# Lampiran A–C — Karsa

Konteks untuk laporan. Ditulis dengan asumsi aplikasi sudah dipasang dan
diskalakan sebagaimana dirancang, jadi komponen server dan klaster dijelaskan
sebagai bagian sistem. Keadaan purwarupa hari ini ada di `docs/status.md`.

**Karsa** adalah ruang kerja kolaboratif berbasis web yang mengubah ucapan dan
teks menjadi visual bersama, dikerjakan beberapa orang pada waktu yang sama.
Pembedanya satu kalimat: kanvasnya **dapat dioperasikan tanpa tangan dan diikuti
tanpa mata**.

---

## Ringkasan produk dan fitur

### Masalah yang dijawab

Hasil kerja tim daring hampir selalu berwujud visual - peta gagasan, papan
retro, matriks prioritas. Ikut berkontribusi di sana menuntut dua kemampuan
sekaligus: **membuat** isi kanvas, dan **mengikuti** perubahannya pada saat
perubahan itu terjadi. Keduanya tertutup bagi penyandang disabilitas, dan justru
dari dua arah yang berlawanan. Yang berkebutuhan motorik masih bisa melihat
tetapi tidak bisa membuat, karena menggambar dan menyeret bertumpu pada kendali
kursor yang presisi. Yang tunanetra bisa berbicara tetapi tidak bisa mengikuti,
karena kanvas dipahami dengan mata sementara percakapan rapat penuh rujukan
tunjuk seperti "yang ini kita pindahkan ke sini".

Akibatnya peran mereka bergeser dari penyusun menjadi pendengar: gagasannya baru
sampai ke kanvas apabila ada rekan yang bersedia menuliskannya.

Alat papan kerja sejenis sudah bisa dibaca pembaca layar. Yang belum digarap
siapa pun adalah **kesadaran situasional selama kolaborasi berlangsung** - bisa
mengikuti apa yang sedang berubah, oleh siapa, di bagian mana, tanpa melihat.
Di situlah Karsa mengambil tempat.

### Dari teks dan ucapan menjadi visual bersama

Dua jalur masukan, satu hasil.

**Jalur teks dan papan ketik.** Seluruh isi kanvas dapat dibangun tanpa tetikus
sama sekali. Setiap operasi punya pintasan - menambah simpul, mengubah judul,
memindahkan ke induk lain, menghubungkan, memberi status, berkomentar - dan yang
pintasannya belum dihafal dijangkau lewat daftar perintah Ctrl+K yang memuat
setiap perintah, alat, dan templat dalam satu daftar yang bisa dicari. Ini bukan
mode aksesibel yang harus dinyalakan; ini cara kerja bawaannya.

**Jalur ucapan.** Kalimat yang diucapkan diubah menjadi operasi kanvas oleh
rantai yang seluruhnya berjalan di perangkat. Yang membedakannya dari asisten
suara biasa: hasilnya berhenti di sebuah **draf** yang menampilkan apa yang
didengar, apa yang dipahami, dan apa yang akan dilakukan - sebelum satu pun
perubahan menyentuh kanvas bersama. Draf itu bisa dijawab dengan suara juga,
sehingga lingkaran bicara, tinjau, terapkan tidak menuntut satu jari pun.

Keduanya bermuara ke tempat yang sama karena tidak ada jalan lain menuju data:
papan ketik, tetikus, dan suara semuanya berakhir pada satu jenis perintah yang
divalidasi di satu tempat.

### Orkestrasi: dari kalimat menjadi alat yang tepat

Bagian ini yang membedakan Karsa dari "papan kerja dengan perintah suara".

Asisten suara biasa memetakan kalimat ke satu perintah. Karsa memakai
**orchestrator** yang lebih dulu menjawab pertanyaan berbeda: **kalimat ini
sebenarnya meminta apa?** Jawabannya menentukan bukan cuma isi perubahan
melainkan **bentuk kerja apa yang cocok untuk rapat ini** - dan itulah lompatan
dari mencatat menjadi membantu.

Tiga rute, diputuskan berurutan karena yang murah dan pasti harus menang atas
yang pintar dan ragu.

**Alat disebut langsung.** "Bikin voting untuk memilih prioritas semester ini."
Tidak ada yang perlu ditebak; orchestrator menyusun sub-pohon voting lengkap
dengan pilihannya.

**Alat tersirat tanpa disebut.** "Kenapa bisa tingkat putus mata kuliah setinggi
itu?" Tidak ada nama alat di kalimat itu, tetapi bentuk kalimatnya menelusuri
sebab, dan yang cocok adalah templat lima kenapa. Sistem **menawarkan**, dengan
keyakinan yang sengaja diturunkan dan kalimat yang berbeda: "ini usulan, bukan
keputusan". Inilah kemampuan yang paling sulit dan paling berharga - mengenali
bahwa sebuah rapat sedang membutuhkan alat tertentu sebelum pesertanya sendiri
menyebutkannya.

**Isi biasa.** "Tambahkan gagasan pelatihan dosen di bawah rancangan mata
kuliah." Bukan permintaan alat; diserahkan ke tahap penyusun struktur.

Di luar ketiganya ada satu rem: **dua alat disebut dalam satu kalimat berarti
bertanya, bukan memilih.** "Kita bikin retro sekalian voting ya" tidak pernah
dijawab dengan tebakan.

**Tahapnya diberi nama, dan namanya ikut ke layar.** Di bawah orchestrator ada
penyusun struktur, pemilih alat, dan perapi judul. Tiap usulan membawa nama tahap
yang menghasilkannya, sehingga pengguna bisa **membantah bagian yang salah saja**
alih-alih menerima atau menolak seluruh jawaban. Jawaban yang tidak menyebut
asalnya cuma punya dua nasib: dipercaya seluruhnya atau diabaikan seluruhnya.

**Model punya pendapat; kode memegang aturan.** Model memilih rute dan menyusun
satu judul pendek. Ia tidak pernah mengeluarkan id simpul, tidak pernah
mengeluarkan koordinat, dan tidak pernah menghasilkan perintah secara langsung -
perintahnya dibangun dari daftar alat dan templat yang sudah tertulis, lalu
divalidasi dengan validator yang sama persis dengan yang dipakai papan ketik.
Akibatnya satu field yang dihalusinasikan tidak bisa menjadi dokumen yang rusak.

**Seluruh rantainya berjalan di perangkat**: deteksi bicara, pengenalan ucapan,
dan model bahasa. Audio tidak pernah keluar dari mesin, dan yang dikirim ke model
adalah **struktur - bukan tangkapan layar** - yang isinya dapat dibaca pengguna
di layar sebelum ia menjawab. Ini janji privasi yang bisa diperiksa, bukan
sekadar diucapkan.

**Dan kualitasnya diukur.** Perutean diuji terhadap 22 kasus yang sengaja
didominasi kalimat rapat biasa yang **tidak** boleh memicu alat - karena perute
yang menyambar templat setiap melihat kata "prioritas" lebih buruk daripada yang
tidak pernah menyambar sama sekali. Menyela adalah ongkos yang dibayar semua
orang di ruangan.

Uraian teknisnya di Lampiran B, terutama B.5.

### Satu model, tiga tampilan setara

Isi ruang disimpan sekali dan digambar tiga cara: **kanvas visual**, **outline
teks** yang terbaca pembaca layar dengan pola ARIA tree sungguhan, dan
**penelusuran lewat bunyi**. Ketiganya bukan salinan satu sama lain melainkan
tampilan atas data yang sama, jadi ketiganya berubah bersamaan dan mustahil
menampilkan isi yang berbeda.

Bentuk visualnya tidak dipatok pada satu jenis diagram. Peta gagasan, hierarki,
diagram alur, garis waktu, dan bagan kolom semuanya **algoritma tata letak yang
berbeda atas model yang sama** - bukan tipe data baru - sehingga berpindah
bentuk tidak pernah mengubah isi dan tidak pernah merusak outline.

### Alat rapat sebagai tata letak, bukan jendela

Karsa menyediakan alat dan templat yang benar-benar dipakai tim: **voting**
dengan hitungan suara, **papan retro** tiga kolom, **matriks dampak-usaha** 2x2,
**rencana sprint**, **lima kenapa**, dan **tempat parkir** untuk pertanyaan yang
ditunda.

Yang membedakannya dari papan kerja lain bukan daftar itu melainkan cara alat
dibangun. Sebuah alat **tidak pernah memiliki data**: isinya adalah anak-anak
dari simpul itu sendiri. Pilihan voting adalah simpul, kolom retro adalah simpul,
kuadran matriks adalah simpul. Akibatnya tiap alat langsung terbaca di outline,
ikut penelusuran audio, ikut pembatalan, ikut hitungan kontribusi - tanpa satu
baris pun ditulis untuk itu - dan mematikan sebuah alat tidak menghilangkan apa
pun.

Matriks dampak-usaha contoh yang paling jelas. Karena kuadran adalah simpul
kelompok dan bukan wilayah di layar, letak sebuah item bisa **dibacakan dengan
kata**: "Dampak besar, usaha kecil, Tambah praktikum aksesibilitas". Di papan
kerja lain, memindahkan kartu ke kuadran lain tidak menghasilkan apa pun yang
bisa didengar; di sini ia menghasilkan satu kalimat.

### Kolaborasi dan akses

Beberapa orang menyunting bagian berbeda pada saat bersamaan tanpa saling
menimpa. Semua orang tahu siapa hadir, siapa sedang berbicara, dan bagian mana
yang sedang ditunjuk rekannya - supaya "yang ini" tetap punya rujukan yang jelas
di ketiga tampilan.

Bergabung tidak menuntut akun, kata sandi, maupun surel: yang dipakai **kode
ruang**. Ruang punya dua keadaan akses - terbuka, atau terkunci dengan ruang
tunggu yang dijawab di panel peserta pada detik yang sama, bukan di kotak masuk
berjam-jam kemudian.

### Mengikuti tanpa melihat

Setiap perubahan menghasilkan **satu kalimat** dan **satu bunyi pendek**.
Kalimatnya masuk ke antrean narasi milik Karsa sendiri, yang menahannya sampai
ada jeda **bicara** - bukan sekadar jeda pembaca layar - sehingga narasi tidak
menabrak percakapan rapat. Bunyinya dirancang, bukan dekoratif: arah nada
menyatakan sesuatu muncul atau hilang, tinggi nada menyatakan kedalaman di pohon,
dan timbre menyatakan siapa pelakunya.

### Ringkasan kontribusi

Akhir sesi menampilkan porsi tiap peserta, dihitung dari jejak peristiwa dan
**dipecah menurut jalur masukan**: papan ketik, suara, tetikus. Angka ini yang
membedakan Karsa dari papan kerja biasa - kontribusi lewat suara tercatat setara
dengan kontribusi lewat papan ketik, dan bagi seseorang yang selama ini
gagasannya baru sampai ke kanvas lewat tangan orang lain, itu bukan statistik
melainkan bukti.

### Tujuh hal yang membedakan

1. **Orkestrasi yang memilih alat, bukan sekadar mencatat kalimat.** Sistem
   mengenali bahwa sebuah rapat sedang membutuhkan voting, retro, atau matriks
   prioritas - bahkan ketika pesertanya tidak menyebutkannya - lalu menawarkannya
   sebagai usulan yang bisa ditolak.
2. **Tiga tampilan setara**, bukan satu kanvas yang ditambahi keterangan
   aksesibilitas.
3. **Tidak ada makna yang disimpan lewat koordinat** - itulah yang membuat letak
   bisa dibacakan dengan kata dan pergantian bentuk visual selalu aman.
4. **Setiap perubahan punya kalimat dan bisa dibatalkan**, termasuk perubahan
   yang dilakukan asisten.
5. **Asisten mengusulkan, manusia memutuskan** - tidak ada yang mendarat di
   kanvas bersama tanpa persetujuan, dan tiap usulan menyebut tahap mana yang
   membuatnya.
6. **Seluruh pemrosesan di perangkat**, tanpa biaya per pemakaian dan tanpa isi
   rapat keluar dari mesin.
7. **Berjalan tanpa internet sama sekali** dalam mode kelas.

---

## Lampiran A. Diagram Use Case

### A.1 Aktor

Karsa punya tiga aktor. Yang membedakan mereka bukan wewenang — tidak ada
tingkatan izin di sistem ini — melainkan **jalur akses**: cara masing-masing
mencapai kegiatan yang sama.

**Peserta jalur papan ketik dan suara (persona A).** Penyandang disabilitas
motorik tangan. Masih bisa melihat kanvas, tetapi menggambar, menarik panah, dan
menyeret elemen semuanya bertumpu pada kendali kursor yang presisi, dan itu yang
tidak dimilikinya. Jalur utamanya suara, dengan papan ketik sebagai cadangan
penuh: setiap operasi di Karsa punya pintasan papan ketik, dan yang pintasannya
belum dihafal dijangkau lewat daftar perintah `Ctrl+K`.

**Peserta jalur teks dan bunyi (persona B).** Tunanetra atau low vision. Bisa
berbicara, tetapi tidak bisa mengikuti kanvas: papan kerja dipahami dengan mata,
sementara percakapan rapat penuh rujukan tunjuk seperti "yang ini kita pindahkan
ke sini". Ia membaca seluruh isi kanvas lewat pembaca layar atau braille
miliknya sendiri pada tampilan outline, mengetahui perubahan saat perubahan itu
berlangsung lewat bunyi pendek, dan menelusuri struktur lewat penelusuran audio.

**Peserta jalur tetikus (peserta umum).** Memakai kanvas seperti papan kerja
biasa: menyeret kartu, menarik hubungan, mengetik judul. Aktor ini penting bukan
karena kebutuhannya khusus, melainkan karena **ia yang biasanya jadi mayoritas
di ruangan**, dan sistem harus membuat kontribusi ketiganya setara tanpa
memperlambat siapa pun.

Aktor sistem: **Asisten pada perangkat**, yang tidak pernah mengubah kanvas
sendiri. Ia mengusulkan; manusia yang memutuskan.

### A.2 Kegiatan

Kegiatan yang dituju ketiga aktor sama persis, dan inilah inti diagram use case:

| Kegiatan | Jalur papan ketik/suara | Jalur teks/bunyi | Jalur tetikus |
| -------- | ----------------------- | ---------------- | ------------- |
| Bergabung ke ruang | nama + kode, `Tab`/`Enter` | sama, terbaca pembaca layar | sama |
| Menambah gagasan | ucapan atau `n` | `n` dari outline | tombol `+` di simpul |
| Mengubah judul | ucapan atau `Enter` | `Enter` di baris outline | klik ganda |
| Memindahkan simpul | ucapan atau `m` | `m` lalu pemilih induk | seret ke simpul lain |
| Menghubungkan simpul | ucapan atau `r` | `r` lalu pemilih target | tarik dari titik sambung |
| Menyisipkan alat/templat | ucapan atau `Ctrl+K` | `Ctrl+K` | tombol "..." di toolbar |
| Memilih pada voting | `v` | `v`, hitungan dibacakan | klik tombol pilih |
| Mengikuti perubahan | narasi + bunyi | narasi + bunyi | melihat kanvas |
| Menelusuri struktur | panah di pohon | penelusuran audio `.` | melihat kanvas |
| Meninjau kontribusi | halaman ringkasan | halaman ringkasan | halaman ringkasan |

Tiga kolom, satu daftar kegiatan. Tidak ada baris yang cuma bisa ditempuh satu
kolom — itu aturan yang mengikat setiap fitur: **fitur yang tidak bisa dijalankan
lewat papan ketik, dibaca sebagai teks, dan menghasilkan peristiwa audio tidak
masuk ke produk.**

### A.3 Yang membuat ketiganya bermuara ke tempat yang sama

Bukan tiga antarmuka yang disamakan hasilnya, melainkan **satu model data dengan
tiga tampilan setara**: kanvas visual, outline teks yang terbaca pembaca layar,
dan penelusuran lewat bunyi. Ketiganya bukan salinan satu sama lain melainkan
tampilan atas data yang sama, jadi ketiganya berubah bersamaan dan mustahil
menampilkan isi yang berbeda.

Di bawahnya ada satu aturan arsitektur yang menjaga hal ini tetap benar:
**tidak ada jalan lain dari antarmuka menuju data.** Papan ketik, tetikus, dan
suara sama-sama berakhir pada satu jenis objek — *command* — yang divalidasi di
satu tempat sebelum dokumen berubah.

---

## Lampiran B. Arsitektur Kecerdasan Buatan

### B.1 Alur Pemrosesan Suara

Alurnya tujuh tahap, dan seluruhnya berjalan di perangkat pengguna.

**Satu, penangkapan.** Mikrofon hidup **hanya selama sakelar bicara aktif**,
tidak pernah menyala terus-menerus. Sakelarnya mengunci bila diketuk dan
berperilaku tekan-tahan bila ditahan — dua perilaku dalam satu tombol, karena
menahan tombol selama satu kalimat justru sulit bagi persona A yang memakai
suara persis karena hal semacam itu sulit.

**Dua, deteksi bicara.** Silero VAD lewat ONNX Runtime Web menandai bagian yang
berisi ucapan, memisahkan suara dari jeda dan derau ruangan.

**Tiga, pengenalan ucapan.** Model ASR lokal (transformers.js dengan WebGPU,
turun ke WASM bila WebGPU tidak tersedia) mengubah audio menjadi teks.
Transkripnya **mengalir kata demi kata**, bukan muncul sekaligus di akhir. Ini
bukan hiasan: ia yang membuat penantian dua sampai enam detik terasa nol, dan ia
juga yang membuat salah dengar ketahuan sebelum sempat jadi operasi.

**Empat, penyusunan konteks.** Yang dikirim ke model bahasa adalah **struktur,
bukan tangkapan layar**: outline ringkas ruang, simpul yang sedang difokus, dan
daftar alat beserta skema masing-masing. Ini jauh lebih kecil, jauh lebih tepat,
dan bisa dibaca manusia — antarmuka menampilkan isi konteks itu apa adanya di
blok yang bisa dibuka, karena "percaya saja" bukan fitur aksesibilitas.

**Lima, perutean oleh orchestrator.** Orchestrator memutuskan ucapan itu
permintaan alat atau isi biasa, lalu menyerahkannya ke tahap yang tepat. Tiga
jalur, berurutan, karena yang murah dan pasti harus menang atas yang pintar dan
ragu:

1. **Alat disebut langsung** — "bikin voting untuk memilih prioritas". Tidak ada
   yang perlu ditebak, keyakinan tinggi.
2. **Alat tersirat dari bentuk kalimat** — "kenapa bisa setinggi itu" mengarah ke
   templat lima kenapa. Keyakinannya sengaja rendah dan kalimatnya berbeda:
   "ini usulan, bukan keputusan".
3. **Isi biasa** — menambah, mengubah nama, memindahkan, menghubungkan.

Ada satu rem di luar ketiganya: **dua alat disebut dalam satu kalimat berarti
bertanya, bukan memilih.** "Kita bikin retro sekalian voting ya" tidak pernah
dijawab dengan tebakan.

**Enam, pembentukan perintah dan validasi.** Model memilih rute dan judul; **kode
yang menyusun perintahnya**. Model tidak pernah mengeluarkan id simpul, tidak
pernah mengeluarkan koordinat, dan tidak pernah menghasilkan perintah langsung —
perintahnya dibangun dari registry alat dan templat, lalu divalidasi validator
domain yang sama dengan yang dipakai papan ketik. Akibatnya satu field yang
dihalusinasikan tidak bisa menjadi dokumen yang rusak.

**Tujuh, gerbang manusia.** Hasilnya muncul sebagai **draf lokal** yang belum
menyentuh kanvas bersama. Draf menampilkan tiga hal sebelum apa pun mendarat:
alasan perutean, tahap mana yang mengusulkan tiap baris, dan isi konteks yang
dikirim ke model. Kursor asisten berdiri di tempat perubahan akan mendarat dan
menunggu di situ. Jawabannya bisa diucapkan — saat usulan terpampang, ucapan
berikutnya dibaca sebagai jawaban, bukan perintah baru — sehingga seluruh
lingkaran bicara → tinjau → terapkan tidak menuntut satu jari pun. Setelah
disetujui, operasi mendarat **satu per satu**, kursor berpindah ke tiap sasaran,
dan tiap langkah punya kalimatnya sendiri: tiga operasi jadi tiga kalimat yang
bisa diikuti pembaca layar, bukan satu "3 simpul ditambahkan" yang tidak menyebut
di mana.

### B.2 Model yang Digunakan dan Alasan Pemilihannya

**Pengenalan ucapan: model ASR kecil lewat transformers.js.** Dipilih karena
berjalan sepenuhnya di peramban dengan WebGPU dan tidak menuntut pemasangan apa
pun di sisi pengguna. Alternatif whisper.cpp sebagai proses terpisah dicoret
lebih awal: dua jalur pengiriman berarti dua jalur bug, dan sidecar membatalkan
janji "buka peramban, langsung jalan".

**Deteksi bicara: Silero VAD.** Kecil, cepat, dan sudah tersedia dalam format
ONNX yang berjalan di peramban. Fungsinya bukan mengenali kata melainkan
memutuskan kapan ada yang berbicara, dan untuk itu model besar tidak memberi
keuntungan apa pun.

**Model bahasa: model instruksi 7B lewat Ollama, bawaannya `qwen2.5:7b`.**
Dipilih karena tiga alasan yang saling menopang. Pertama, **ia muat di laptop
kelas menengah** dan berjalan dengan kecepatan yang bisa ditutupi transkrip
mengalir — sekitar dua sampai tiga detik pada panggilan hangat. Kedua, **ia
mendukung constrained decoding berskema JSON** melalui Ollama, dan itu yang
menentukan berhasil-tidaknya. Ketiga, **kemampuan Bahasa Indonesianya memadai
untuk tugas yang diberikan**, yang memang sengaja dibuat sempit: memilih rute
dan menyusun satu judul pendek, bukan mengarang isi rapat.

Poin kedua layak diperjelas karena sering disalahpahami. Yang dipakai bukan
"tolong balas dalam bentuk JSON", melainkan **skema JSON yang membatasi
sampler**: token yang akan membuat keluaran tidak sah tidak pernah dipilih. Model
kecil gagal bukan karena bodoh, melainkan karena bentuk keluarannya melenceng —
dan itu masalah yang bisa dihilangkan sepenuhnya, bukan dikurangi.

Skemanya **satu per alat, bukan satu untuk semua**. Skema kecil yang tepat itulah
yang membuat constrained decoding mendarat; satu skema besar yang memuat semua
alat adalah skema yang tidak cocok untuk satu pun.

**Penyedia lain disediakan lewat satu antarmuka** dan bisa diganti tanpa
menyentuh sisa sistem: WebLLM di peramban bagi yang tidak mau memasang apa pun,
vLLM di server institusi untuk satu kampus, dan layanan awan. Satu kalimat yang
mengikat semuanya: **layanan awan tidak pernah menjadi cadangan otomatis.**
Kalau model lokal tidak ada, jawabannya "model lokal tidak ada" — bukan
diam-diam mengirim isi rapat ke server pihak ketiga. Menyalakannya harus sadar,
dan lencana di bilah atas berubah selama aktif.

### B.3 Mekanisme Berjalan di Perangkat dan Rencana Cadangan

Yang membuat "di perangkat" bukan sekadar klaim: **Web Speech API dilarang
dipakai**, karena ia mengirim audio ke server Google, dan itu membatalkan janji
inti produk. Seluruh rantai — VAD, ASR, model bahasa — berjalan di mesin
pengguna.

Rencana cadangannya berlapis, dan tiap lapis turun kemampuannya dengan cara yang
diberitahukan, bukan diam-diam:

| Keadaan | Yang terjadi |
| ------- | ------------ |
| WebGPU tidak tersedia | ASR turun ke WASM. Lebih lambat, tetap lokal |
| Ollama tidak terpasang | Perutean memakai pencocokan aturan. Semua alat dan templat tetap bisa diminta, cuma tanpa penafsiran kalimat bebas |
| Model terpasang tapi tidak menjawab | Hasil turun ke pencocokan aturan, **dan kalimat alasannya menyebutkan kegagalan itu** |
| Tanpa jaringan sama sekali | Seluruh aplikasi tetap berjalan. Ini mode kelas, dan ia dirancang begitu sejak awal |
| Mikrofon ditolak izinnya | Papan ketik dan tetikus tetap menjalankan seluruh produk |

Baris ketiga penting untuk kejujuran demonstrasi: demo yang tampak seperti model
lokal padahal bukan adalah kebohongan yang paling mudah dibuat dan paling sulit
dimaafkan.

Pencocokan aturan bukan cadangan darurat yang setengah jadi. Ia deterministik,
seketika, dan pada set uji internal justru **lebih akurat** daripada model 7B
(22/22 berbanding 17/22 pada 22 kasus). Yang tidak dimilikinya adalah
kemampuan menafsirkan kalimat yang tidak terduga — dan itu memang satu-satunya
hal yang model bahasa tambahkan.

### B.4 Penanganan Ketidakpastian dan Kesalahan Pengenalan

Prinsipnya satu kalimat: **sistem tidak pernah menebak pada kanvas milik
bersama.** Turunannya empat.

**Setiap usulan membawa angka keyakinan**, dan yang di bawah 60 persen ditandai
sebagai perlu dilihat. Usulan yang tersirat — yang alatnya tidak disebut
pengguna — sengaja diberi keyakinan rendah dan kalimat yang berbeda, supaya
menawarkan tidak berubah jadi menyela.

**Ambiguitas dijawab dengan pertanyaan, bukan pilihan.** Dua alat dalam satu
kalimat, atau rujukan tunjuk yang tidak jelas menunjuk simpul mana, menghasilkan
pertanyaan dengan pilihan yang bisa dijawab — bukan tebakan yang paling mungkin.
Pemeriksaan ambiguitas ini **ada di kode, bukan di prompt**: aturan keselamatan
yang bergantung pada model 7B mengingat satu baris prosa bukan aturan
keselamatan.

**Ucapan yang tidak dikenali ditampilkan apa adanya** sebagai teks yang bisa
disunting, bukan dibuang dan bukan dipaksakan jadi operasi. Menolak menjawab
adalah jawaban yang sah; mengarang jawaban di kanvas bersama tidak.

**Semua bisa dibatalkan.** Setiap perubahan menghasilkan peristiwa yang
dinarasikan dalam satu kalimat dan bisa dibatalkan dengan `Ctrl+Z`. Isi mundur,
tetapi catatan peristiwanya tetap tambah-saja — menyembunyikan pembatalan dari
catatan berarti membuat perubahan yang tidak bisa didengar siapa pun sesudahnya.
Templat yang mendaratkan enam simpul sekaligus tetap satu langkah undo, karena
enam kali `Ctrl+Z` untuk membatalkan satu gerakan bukan "dapat dibatalkan" dalam
arti yang dikenali orang.

Kualitas perutean dijaga **set uji berisi 22 kasus** yang dijalankan terhadap
kedua penyedia. Isinya sengaja didominasi kasus negatif — kalimat rapat biasa
yang **tidak** boleh memicu alat — karena perute yang menyambar templat tiap
melihat kata "prioritas" lebih buruk daripada yang tidak pernah menyambar sama
sekali: menyela itu ongkos yang dibayar semua orang di ruangan. Set uji ini
menemukan tiga positif palsu pada jalannya yang pertama.


### B.5 Arsitektur Multi-Agent

"Multi-agent" di Karsa bukan kawanan agen dan bukan pertunjukan. Ia **pipeline
yang diberi nama**, dan penamaannya yang membuat perbedaan: jawaban yang tidak
menyebut asalnya cuma bisa diterima atau diabaikan seluruhnya, sedangkan jawaban
yang menyebut tahapnya bisa dibantah pada bagian yang salah saja.

**Orchestrator** menerima transkrip beserta konteks ruang, lalu memutuskan rute
dan menyerahkan pekerjaan ke tahap di bawahnya. Ia sendiri tidak menghasilkan
perubahan apa pun.

**Penyusun struktur** mengubah ucapan menjadi simpul bertipe dan menempatkannya
di pohon: menambah, mengubah nama, memindahkan, menghubungkan, memberi status.

**Pemilih alat** menentukan apakah yang diminta lebih tepat berbentuk alat atau
templat, dan menyusun sub-pohonnya lengkap.

**Perapi judul** memendekkan judul supaya muat satu tarikan napas, batas yang
ada karena judul harus bisa disebut dalam satu kali ucap.

Keempatnya menghasilkan **satu bentuk rencana yang sama**, apa pun tahap yang
membuatnya, sehingga panel draf, kursor asisten, dan mekanisme penerapan tidak
perlu tahu siapa yang mengerjakan apa.

**Menawarkan alat yang tidak diminta.** Pengguna sering tidak menyebut alatnya:
ia bilang "kita harus putuskan mana yang duluan", bukan "bikin voting". Sistem
boleh menawarkan, dengan tiga syarat yang membedakan menawarkan dari menyela.
Keyakinannya diturunkan dan ditandai perlu dilihat, kalimatnya berbeda ("ini
usulan, bukan keputusan"), dan mengabaikannya cukup dengan mendiamkannya. Satu
aturan lagi menjaga agar ini tidak berubah jadi gangguan: **sekali ditolak, alat
itu tidak ditawarkan lagi di sesi yang sama.** Asisten yang bertanya dua kali
sudah bukan bertanya.

**Skema per alat, bukan satu skema untuk semua.** Tiap alat mendaftarkan skema
keluarannya sendiri. Skema kecil yang tepat itulah yang membuat constrained
decoding mendarat pada model 7B; satu skema besar yang memuat semua alat adalah
skema yang tidak cocok untuk satu pun. Ekstraktor sudah menentukan alat mana yang
diminta sebelum skema dipilih, jadi jumlah skema tidak pernah jadi beban saat
berjalan; ia cuma daftar yang tumbuh.

**Aturan jadi lantai, model jadi jangkauan.** Pemeriksaan yang menyangkut
keselamatan diletakkan di kode, bukan di prompt. Dua alat disebut dalam satu
kalimat diperiksa **sebelum** model ditanya, karena aturan yang bergantung pada
model 7B mengingat satu baris prosa bukan aturan. Sebaliknya, bila model menjawab
"isi biasa" padahal kalimatnya jelas menyebut nama sebuah alat, nama yang menang:
kata yang ada di kalimat bukan soal penilaian.

**Beberapa orang, beberapa masukan.** Empat orang bicara menghasilkan empat
transkrip, bukan satu. Menggabungkannya menjadi satu aliran justru membuang
informasi paling berharga di ruangan: siapa mengusulkan apa. Karena itu tiap
transkrip membawa identitas pengucapnya sejak dari mikrofon, tiap orang punya
antrean drafnya sendiri, dan draf orang lain tidak pernah terlihat sebelum
diterapkan; yang terlihat cuma penanda kehadiran "sedang menyiapkan sesuatu".
Menentukan giliran bicara **bukan** urusan agen: itu keputusan sosial, dan sistem
menampilkan keduanya lalu diam.

**Peletakan bukan urusan agen.** Menempatkan simpul baru adalah algoritma, bukan
penilaian, dan ini ditetapkan sebagai batas rancangan supaya tidak dibangun
sebagai agen di kemudian hari. Alasannya tiga: tata letak harus deterministik
agar kanvas tidak melompat di depan orang yang paling terganggu olehnya; ia
terjadi tiap kali sebuah simpul lahir sehingga dua detik per simpul mustahil; dan
model yang memutuskan letak akan mulai menaruh makna di koordinat, yang justru
hilang bagi pengguna tunanetra. Yang **memang** penilaian, dan sudah punya
namanya sendiri, adalah memilih bentuk visual mana yang cocok dengan isi ruang,
dan hasilnya diusulkan, bukan diterapkan.

**Pengamat dinamika, opsional dan mati secara bawaan.** Dirancang untuk membaca
jejak perubahan dan transkrip, mengenali pola kerja tim yang punya nama: dua
keputusan yang saling bertentangan, satu simpul yang diubah bolak-balik, suara
yang terbelah rata pada sebuah voting, pertanyaan yang lama tidak terjawab. Lalu
ia **menawarkan alat** untuk menanganinya, misalnya tabel perbandingan atau
daftar kriteria keputusan.

Bedanya dengan agen lain: agen lain membaca **isi**, agen ini membaca **orang**.
Sistem yang memberi tahu satu ruangan bahwa dua orang sedang tidak sepakat
mengubah apa yang orang berani ucapkan di ruangan itu. Karena itu ia diikat lima
aturan: mati sampai dinyalakan oleh manusia, berbicara tentang isi dan tidak
pernah tentang orang, tidak pernah menilai siapa pun, terlihat sedang menyala
lewat lencana di bilah atas, dan satu tawaran per pola per sesi. Satu pola
sengaja tidak diberi usulan sama sekali, yaitu "seseorang menyumbang lebih
sedikit", karena orang bisa diam justru akibat antarmuka yang menghalanginya, dan
produk ini dibangun untuk orang itu; menyorotnya berarti menyalahkan yang
dirugikan.

**Kualitas perutean diukur, bukan diyakini.** Ada set uji berisi 22 kasus yang
dijalankan terhadap kedua penyedia, pencocokan aturan dan model lokal, dan isinya
sengaja didominasi kalimat rapat biasa yang **tidak** boleh memicu alat. Set uji
ini menemukan tiga positif palsu pada jalannya yang pertama, semuanya kata pemicu
yang juga kata sehari-hari, dan dari situ lahir dua aturan yang kini berlaku:
kata pemicu tidak boleh kata sehari-hari, dan nama alat baru dianggap permintaan
bila didahului kata permintaan.

---

## Lampiran C. Arsitektur Aplikasi Web

### C.1 Diagram Arsitektur Sistem

Sistemnya berlapis empat, dan aliran datanya searah.

**Lapisan masukan** menerima papan ketik, tetikus, dan suara. Papan ketik dan
tetikus masuk langsung ke inti karena tidak ada yang perlu ditafsirkan; suara
masuk ke lapisan agen lebih dulu.

**Lapisan agen** berisi orchestrator dan tahap-tahap di bawahnya: penyusun
struktur, pemilih alat, perapi judul. Lapisan ini **mengusulkan dan tidak pernah
memutuskan**. Keluarannya satu bentuk yang sama apa pun tahap yang
menghasilkannya, dan tiap langkah membawa nama tahapnya supaya bisa dibantah
pada bagian yang salah saja.

**Gerbang manusia** memisahkan lapisan agen dari inti. Tidak ada panah yang
melompatinya.

**Lapisan inti** adalah satu-satunya yang boleh mengubah data. Isinya perintah,
validator sembilan aturan, dokumen, dan catatan peristiwa yang tambah-saja. Di
sinilah semua invarian ditegakkan: satu simpul tepat satu induk, tidak ada makna
yang disimpan lewat koordinat, semua isi bertipe, judul dibatasi satu tarikan
napas, dan setiap operasi menghasilkan peristiwa yang bisa dinarasikan dalam satu
kalimat.

**Lapisan tampilan** berisi tiga tampilan setara yang semuanya membaca dokumen
yang sama. Tidak ada tampilan yang menurunkan isinya dari tampilan lain.

Catatan peristiwa layak disebut tersendiri. Ia ada di dalam dokumen sejak
rancangan paling awal, lengkap dengan pelaku dan jalur masukan, karena **satu
struktur melayani empat fitur**: bunyi peristiwa, narasi untuk pembaca layar,
mode telaah yang berjalan mundur lewat sesi, dan ringkasan kontribusi di akhir
rapat. Atribusi tidak bisa ditambahkan belakangan tanpa membuat halaman ringkasan
berbohong.

### C.2 Komponen Antarmuka Pengguna

**Kanvas** adalah latar seluruh jendela; seluruh perabot mengambang di atasnya.
Simpul digambar sebagai elemen HTML di atas lapisan SVG untuk garis hubung —
bukan sebagai bentuk di dalam SVG — karena fokus, roving tabindex, dan ARIA
berperilaku benar pada elemen sungguhan dan tidak pada elemen `<g>`. Tipe simpul
dibawa empat jalur sekaligus: ikon, kata, warna, dan siluet kartu, karena warna
saja gagal untuk sebagian orang.

**Outline** memakai pola ARIA tree yang sungguhan dengan roving tabindex, bukan
daftar div yang diberi atribut. Tiap baris membawa keterangan yang tidak terlihat
di kanvas tetapi terbaca pembaca layar: status, hubungan ke simpul lain, jumlah
komentar, siapa sedang menunjuknya, dan hitungan suara bila ia bagian dari
voting.

**Panel pemeriksa** di sisi kanan menampung empat isi yang berganti: jejak
perubahan, pemeriksaan perintah, daftar peserta beserta ruang tunggu, dan
komentar. Panel dibuka dan ditutup lewat tabnya sendiri — mengklik tab yang
sedang terbuka menutupnya — sehingga tidak perlu tombol "sembunyikan panel"
terpisah.

**Dok mengambang** di bawah berisi status asisten dan dua tombol utama: Bicara
dan Telusur audio, **berukuran sama dan berdampingan**. Ukurannya sama bukan
kebetulan: keduanya jalur utama bagi dua persona yang berbeda, dan membuat salah
satunya lebih kecil berarti menyatakan salah satunya kurang penting.

**Alat** adalah kartu di kanvas yang menggambar sebuah simpul beserta anak-
anaknya: voting sebagai daftar berhitungan suara, retro sebagai tiga kolom,
matriks dampak–usaha sebagai kisi 2×2. Yang penting dari rancangan ini bukan
tampilannya melainkan bahwa **alat tidak pernah memiliki data**: isinya
anak-anaknya sendiri, jadi ia terbaca di outline, ikut penelusuran audio, ikut
undo, dan mematikannya tidak menghilangkan apa pun. Kuadran matriks adalah simpul
kelompok, bukan wilayah di layar — karena itu letak sebuah item bisa dibacakan
dengan kata, sesuatu yang hilang total di papan kerja lain bagi yang tidak
melihat.

**Daftar perintah** `Ctrl+K` memuat setiap perintah, alat, templat, bentuk
kanvas, perpindahan halaman, dan sakelar tampilan dalam satu daftar yang bisa
dicari. Tidak ada kemampuan baru di dalamnya; ia jalan menuju perintah yang
pintasannya belum dihafal.

**Tema terang dan gelap** dengan pilihan eksplisit, bawaannya mengikuti sistem.
Proyektor ruang kuliah dan ruangan redup menuntut jawaban berbeda, dan orang
tidak seharusnya harus mengubah setelan sistem di tengah rapat.

### C.3 Mekanisme Sinkronisasi Antar Peserta

Dokumen ruang disimpan sebagai **CRDT (Yjs), satu dokumen per ruang**, dan
disinkronkan lewat Hocuspocus. Yang melintasi jaringan **hanya dua hal:
perubahan dokumen dan penanda kehadiran.** Tidak ada audio, tidak ada gambar,
tidak ada koordinat. Justru karena itu ruang ini tetap nyaman dipakai pada
sambungan yang lemah.

Kehadiran berjalan di **kanal terpisah dari dokumen** (Awareness): siapa hadir,
siapa sedang berbicara, dan simpul mana yang sedang ditunjuknya. Penandanya
dibatasi sekitar sepuluh kali per detik dengan interpolasi di sisi penerima.
Menunjuk disimpan sebagai **id simpul, bukan posisi kursor** — itulah yang
membuat "yang ini" sampai ke ketiga tampilan: cincin di kanvas, keterangan di
baris outline, dan nama di daftar peserta.

Satu risiko ditangani sejak awal karena ia menyentuh aturan paling dasar. **Yjs
tidak punya pohon dengan operasi pindah yang aman**: bila dua orang memindahkan
simpul secara bersilangan, hasil gabungannya bisa membentuk lingkaran dan
merusak outline serta penelusuran audio. Penanganannya, hubungan induk disimpan
sebagai satu field last-write-wins dengan indeks pecahan untuk urutan — bukan
sebagai daftar anak di dalam induk, yang akan menghasilkan duplikat yang tidak
bisa dideteksi. Bentuk LWW paling buruk menghasilkan siklus, dan **siklus bisa
dipulihkan secara deterministik**: pemeriksaan dijalankan sebagai proyeksi saat
membaca dengan aturan yang sama di semua perangkat, sehingga dokumen yang
bersiklus tidak pernah tampak rusak di mana pun. Pemulihannya diperlakukan bukan
sebagai kerusakan melainkan sebagai perilaku yang dirancang, lengkap dengan bunyi
bentrok dan pengumuman singkat.

Susunan kanvas **boleh berbeda antar perangkat**. Karena tidak ada makna yang
disimpan di koordinat, perbedaan susunan tidak merugikan siapa pun — sementara
kanvas yang melompat setiap ada simpul baru merugikan semua orang, dan paling
menyakiti pengguna low vision. Penempatan yang digeser tangan disimpan per
perangkat, per bentuk visual, dan tidak pernah masuk dokumen.

### C.4 Penyimpanan Data dan Keamanan

**Di klien**, dokumen disimpan di IndexedDB sebagai salinan lokal, sehingga
pekerjaan tetap berjalan ketika jaringan terputus lalu digabungkan kembali
setelah tersambung. Preferensi kecil — nama panggilan, tema, penyedia model,
ruang terakhir — disimpan di localStorage.

**Di server**, PostgreSQL menyimpan snapshot dokumen berkala dan metadata ruang.
Untuk mode kelas — satu kontainer di laptop pengajar, jaringan lokal, tanpa
internet — SQLite dipakai sebagai gantinya, karena memasang PostgreSQL di laptop
yang melayani satu ruangan adalah beban tanpa imbalan.

Keamanannya bertumpu pada satu keputusan yang menyederhanakan sisanya: **tidak
ada akun.** Tidak ada kata sandi yang bisa bocor, tidak ada surel yang disimpan,
tidak ada profil yang bisa dikorelasikan. Yang ada:

- **Kode ruang** sebagai kunci masuk, dan **token** per sesi, bukan sesi
  berkepanjangan.
- **Dua keadaan akses per ruang.** Terbuka berarti siapa pun yang punya kode
  langsung masuk; terkunci berarti kode cuma membawa sampai depan pintu dan
  permintaannya muncul di panel peserta untuk diterima atau ditolak. Bawaannya
  terkunci, karena ongkos salah pilih cuma berat ke satu arah.
- **Undangan lewat surel menyiapkan draf di aplikasi surel pengguna**, bukan
  mengirim apa pun dari sistem. Alamat yang diketik tidak pernah meninggalkan
  perangkat.
- **Audio tidak pernah keluar dari perangkat**, dalam keadaan apa pun, termasuk
  ketika penyedia model awan dinyalakan. Yang bisa keluar dalam keadaan itu hanya
  teks struktur, dan hanya setelah dinyalakan secara sadar.

### C.5 Perangkat dan Kebutuhan Minimum

| | Minimum | Disarankan |
| - | ------- | ---------- |
| **Peramban** | Chrome/Edge 111+, Firefox 121+, Safari 17+ | Chrome/Edge terbaru |
| **RAM klien** | 4 GB | 8 GB bila memakai model lokal |
| **Prosesor** | Dua inti | Empat inti |
| **Layar** | 1024×640 | 1440×900 |
| **Jaringan** | 128 kbps, atau tanpa jaringan untuk mode kelas | Apa pun |
| **Mikrofon** | Tidak wajib | Untuk jalur suara |
| **WebGPU** | Tidak wajib, turun ke WASM | Untuk ASR yang lebih cepat |
| **Pembaca layar** | NVDA, JAWS, VoiceOver, atau TalkBack | — |

Kebutuhan jaringannya rendah karena yang melintas cuma perubahan dokumen dan
penanda kehadiran — beberapa kilobita per menit per orang, satu sampai dua orde
lebih kecil daripada papan kerja yang mengirim posisi kursor piksel demi piksel.

**Untuk pemasangan mode kelas**: satu kontainer di laptop pengajar dengan 4 GB
RAM dan jaringan lokal, tanpa internet sama sekali.

**Untuk pemasangan institusi**: satu kontainer melayani perkiraan 100–300 ruang
serentak atau 500–1500 orang, dengan batas pada memori dan jumlah sambungan,
bukan pada prosesor. Penskalaan ke beberapa instans membutuhkan Redis sebagai
penghubung antar instans dan ingress dengan sesi lengket per ruang, dan di
Kubernetes penskalaannya diatur menurut **jumlah sambungan, bukan penggunaan
prosesor** — karena prosesornya memang jarang sibuk. Satu institusi seukuran
kampus muat di satu kontainer; klaster menjadi masuk akal untuk pemasangan lintas
institusi.
