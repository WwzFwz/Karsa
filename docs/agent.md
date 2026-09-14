# Orchestrator

Sumber kebenarannya `src/core/agent/`.

## Dua penyedia, satu antarmuka

Klaim "hari model lokal masuk, yang berubah satu badan fungsi" sudah dibuktikan,
bukan dijanjikan: `PlanProvider` punya dua implementasi.

| Penyedia | Isinya | Kapan dipakai |
| -------- | ------ | ------------- |
| **Pencocokan aturan** | Tanpa model. Deterministik, instan. | Bawaan. Jalan di kelas tanpa jaringan maupun Ollama. |
| **Ollama di perangkat** | `qwen2.5:7b`, constrained decoding berskema JSON. | Dipilih sadar di Pengaturan. |

Tidak ada yang jadi cadangan diam-diam. Kalau model gagal menjawab, hasilnya
tetap muncul dari pencocokan aturan **dan kalimat alasannya menyebutkan
kegagalan itu** — demo yang tampak seperti model lokal padahal bukan adalah
kebohongan yang paling mudah dibuat dan paling sulit dimaafkan.

Pengaturan menampilkan dua fakta berbeda yang gampang dikira satu: **mana yang
dipilih** dan **mana yang benar-benar siap**. Probe ke `/api/tags` yang
menentukan yang kedua, dan bunyinya apa adanya — "Ollama jalan, tapi qwen2.5:7b
belum diunduh" lebih berguna daripada centang hijau.

## Kenapa model kecil bisa dipakai

Dua hal, dan keduanya soal bentuk keluaran, bukan soal ukuran model.

**Constrained decoding berskema JSON**, bukan "tolong balas dalam JSON".
`format` di Ollama menerima skema, dan samplernya dibatasi ke token yang menjaga
keluaran tetap sah. Model kecil gagal bukan karena bodoh, melainkan karena
bentuk keluarannya melenceng (bagian 8).

**Model memilih rute dan judul; kode yang menyusun perintah.** Model tidak
pernah memilih id simpul, tidak pernah memilih koordinat, dan tidak pernah
mengeluarkan perintah langsung. Perintahnya dibangun dari registry templat, jadi
field yang dihalusinasikan tidak bisa menjadi dokumen yang rusak. **Model punya
pendapat; kode yang memegang aturan.**

Ongkosnya: sekitar 2–3 detik pada panggilan hangat, 11 detik pertama karena
model dimuat. Ditutupi transkrip yang mengalir (bagian 10).

## Tiga jalur, berurutan

Yang murah dan pasti harus menang atas yang pintar dan ragu.

| # | Jalur | Contoh | Keyakinan |
| - | ----- | ------ | --------- |
| 1 | **Alat disebut langsung** | "bikin voting buat memilih prioritas" | 0.94 |
| 2 | **Alat tersirat dari bentuk kalimat** | "kenapa bisa tingkat putus setinggi itu" → lima kenapa | 0.58 |
| 3 | **Isi biasa** | "tambahkan gagasan pelatihan dosen" | dari penyusun |

Yang keempat bukan jalur, melainkan rem: **dua alat disebut dalam satu kalimat →
bertanya.** "Kita bikin retro sekalian voting ya" tidak pernah dijawab dengan
tebakan. Bagian 8 tidak bisa ditawar — sistem tidak menebak di kanvas milik
bersama.

Keyakinan jalur 2 sengaja di bawah 0.6 supaya panel menandainya perlu dilihat,
dan kotak alasannya berbunyi "Ini usulan, bukan keputusan".

## Multi-agent yang jujur

Bukan kawanan agen, bukan teater. Pipeline yang diberi nama:

| Tahap | Tugas |
| ----- | ----- |
| **Penyusun struktur** | Mengubah ucapan jadi simpul bertipe dan menempatkannya di pohon. |
| **Pemilih alat** | Menentukan apakah yang diminta lebih tepat jadi alat atau templat. |
| **Perapi judul** | Memendekkan judul supaya muat satu tarikan napas (aturan 4). |

Kenapa dinamai: jawaban yang tidak menyebut asalnya cuma bisa diterima atau
diabaikan seluruhnya. Jawaban yang menyebut tahapnya bisa **dibantah pada bagian
yang salah saja**. Tiap baris usulan membawa nama tahapnya.

## Alasannya ditampilkan, bukan disembunyikan

Panel draf menampilkan tiga hal sebelum satu pun perubahan mendarat:

1. **Cara ia merutekan** — "Alat diusulkan. Kamu tidak menyebut alatnya, tapi
   kalimatnya menelusuri sebab."
2. **Tahap mana** yang mengusulkan tiap baris.
3. **Yang dikirim ke model**, apa adanya, di blok yang bisa dibuka.

Nomor tiga adalah janji bagian 8 yang dibikin bisa diperiksa: yang dikirim itu
**struktur, bukan tangkapan layar**, dan tidak ada audio. Isinya outline
ringkas, simpul fokus, dan skema tiap alat:

```
ruang: Rapat Kurikulum Semester Genap
bentuk: mindmap
fokus: gagasan "Pelatihan dosen"

outline:
- akar: Kurikulum Semester Genap
  - kelompok: Riset kebutuhan
  ...

alat: suara(judul, pilihan)
templat: voting retro matriks sprint lima_kenapa parkir
```

"Percaya saja" bukan fitur aksesibilitas.

## Satu skema per alat

Tiap alat mendaftarkan skemanya sendiri (D41). Skema kecil yang tepat itulah
yang membuat constrained decoding mendarat; satu skema besar yang memuat semua
alat adalah skema yang tidak cocok untuk satu pun.

Ekstraktor sudah menentukan alat mana yang diminta **sebelum** skema dipilih,
jadi ledakan skema tidak pernah jadi masalah runtime — ia cuma daftar yang
tumbuh.

## Templat: banyak perintah, satu keputusan

Langkah templat mendarat lewat `dispatchBatch`: satu baris, satu kotak centang,
satu langkah undo. Mencentang separuh papan retro bukan sesuatu yang dimaksud
siapa pun.

## Set uji

```bash
npm run eval              # pencocokan aturan
npm run eval -- --ollama  # model lokal
```

27 kasus di `core/agent/cases.ts` (lima di antaranya berbahasa Inggris, D69), dan yang dikumpulkan bukan kasus yang mudah
lulus melainkan yang mudah salah:

- **Negatif.** Sebagian besar isi rapat itu isi biasa. Perute yang menyambar
  templat tiap melihat kata "prioritas" lebih buruk daripada yang tidak pernah
  menyambar sama sekali, karena dia menyela.
- **Ambigu.** Dua templat dalam satu kalimat wajib jadi pertanyaan.
- **Kalimat tunjuk.** "Yang ini pindahkan ke sini" — begitu orang benar-benar
  bicara, dan itu isi biasa, bukan permintaan alat.

Set uji ini langsung membayar dirinya sendiri: tiga positif palsu ketahuan pada
jalannya yang pertama, dan tidak satu pun akan ketahuan dengan mencoba-coba.
Kata "suara" memicu voting pada "suara mahasiswa di survei kemarin cukup jelas";
"prioritas" memicu matriks pada "prioritas kita semester ini adalah
aksesibilitas"; dan "retro" memicu papan retro pada kalimat yang cuma
menyebutnya sebagai peristiwa kemarin.

Perbaikannya dua, dan keduanya jadi aturan:

1. **Kata pemicu tidak boleh kata sehari-hari.** "suara" dan "prioritas"
   dicabut sebagai pemicu tunggal.
2. **Nama saja itu sebutan; nama sesudah kata permintaan itu permintaan.**
   "Catat bahwa retro kemarin sudah kita bahas" menyebut retro dan tidak minta
   apa-apa.

### Angka terakhir

| | aturan | Ollama qwen2.5:7b |
| - | ------ | ----------------- |
| alat disebut langsung | 6/6 | 4/6 |
| alat diusulkan | 3/3 | 0/3 |
| ambigu | 2/2 | 2/2 |
| isi biasa | 11/11 | 11/11 |
| **total** | **22/22** | **17/22** |

Sesudah model jadi orchestrator satu panggilan (D70), Ollama pada 27 kasus: 24–25 lulus
antar jalan (suhu 0 menstabilkan). Yang masih gagal: satu kalimat "mana yang
duluan" dibaca sebagai isi biasa, dan satu kalimat retro kadang dijawab dengan
pertanyaan tanpa menawarkan retro. Waktu 6–12 detik per kalimat.

Angka di atas diambil pada 22 kasus pertama. Sesudah lima kasus berbahasa
Inggris ditambahkan, pencocokan aturan lulus 27/27; Ollama belum diukur ulang.

Angka ini sengaja ditulis apa adanya. Model lokal **sempurna pada negatif** —
tidak pernah menyela ketika tidak diminta — dan **lemah pada positif**: dia
kurang berani, terutama pada permintaan yang tersirat. Untuk sebuah kanvas
bersama, arah salahnya yang benar; kalau harus memilih satu arah gagal, diam
lebih baik daripada menyela.

Dua pelajaran jadi kode, bukan prompt:

- **Rem itu kode.** Dua nama dalam satu kalimat diperiksa **sebelum** model
  ditanya. Aturan keselamatan yang bergantung pada model 7B mengingat satu baris
  prosa bukan aturan keselamatan. Skornya naik dari 0/2 ke 2/2.
- **Aturan jadi lantai, model jadi jangkauan.** Kalau model menjawab "susun"
  padahal kalimatnya jelas menyebut nama templat, nama yang menang. Kata yang
  ada di kalimat bukan soal penilaian.

## Menggantinya dengan model sungguhan

Ganti badan `plan()` dengan constrained decoding berskema JSON terhadap skema
alat yang dipilih. Yang tidak boleh berubah:

- Hasilnya tetap `Plan`, dan `Plan` tetap dibaca sebagai usulan
- Ambigu tetap `question`, tidak dikenali tetap `rawText`
- Tidak ada yang mendarat tanpa gerbang (aturan 8)
- Konteks tetap struktur, tetap bisa dibaca orang sebelum dijawab
