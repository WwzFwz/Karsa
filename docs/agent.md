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

## Menggantinya dengan model sungguhan

Ganti badan `plan()` dengan constrained decoding berskema JSON terhadap skema
alat yang dipilih. Yang tidak boleh berubah:

- Hasilnya tetap `Plan`, dan `Plan` tetap dibaca sebagai usulan
- Ambigu tetap `question`, tidak dikenali tetap `rawText`
- Tidak ada yang mendarat tanpa gerbang (aturan 8)
- Konteks tetap struktur, tetap bisa dibaca orang sebelum dijawab
