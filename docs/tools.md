# Alat

Sumber kebenarannya `src/core/tools/registry.ts`.

## Aturan satu kalimat

**Alat bukan jenis benda baru. Alat adalah tata letak dan kulit interaksi di
atas sub-pohon yang sudah ada.**

Ini gagasan yang sama dengan bagian 2 CLAUDE.md — "bentuk visual hanyalah
algoritma tata letak yang berbeda dari model yang sama" — cuma satu tingkat
lebih ke bawah. Bentuk berlaku untuk seluruh ruang; alat berlaku untuk satu
simpul beserta anak-anaknya.

Isi sebuah alat **adalah anak-anaknya sendiri**:

| Alat | Anaknya adalah |
| ---- | -------------- |
| Voting | pilihan-pilihannya |

`Node.tool` cuma menyatakan cara menggambar. Tidak ada isi yang cuma dimiliki
alat, dan tidak ada bidang data baru.

## Kenapa bukan jendela mengambang

Trido memakai jendela mengambang: kartu punya posisi, urutan tumpuk, dan tombol
perbesar. Itu metafora desktop dan enak dipakai, tapi salah untuk produk ini
karena satu hal yang tidak bisa ditambal:

**Jendela mengambang tidak ada di outline dan tidak ada di telusur audio.**

Timer, voting, dan papan skor yang cuma mengambang di atas kanvas berarti
persona B tidak punya benda itu sama sekali, dan klaim "tiga tampilan setara"
batal. Sebagai simpul, alat ikut semuanya tanpa satu baris kode tambahan.

Rasa kartu Trido tetap didapat — bisa digeser, bisa diperbesar — karena semua
itu keadaan pandangan milik perangkat (D31, D29), bukan dokumen.

Menggambar bebas di kanvas juga bukan jalan keluar: aturan 3 melarangnya.

## Yang didapat gratis

Karena alat tidak punya data sendiri:

- **Outline** membacanya, dan setiap pilihan membawa hitungannya di
  `aria-describedby`.
- **Telusur audio** menjelajahinya seperti cabang biasa.
- **Undo** jalan, karena tidak ada keadaan di luar log.
- **Narasi** jalan: satu peristiwa, satu kalimat (aturan 5).
- **Ringkasan kontribusi** menghitung memilih sebagai ikut serta.
- **Mematikan alat tidak menghilangkan apa pun.** Anaknya memang selalu simpul
  biasa. Ini yang membuat alat aman dicoba.

## Suara adalah peristiwa, bukan angka

Tidak ada `voteCount` di simpul. Hitungannya diturunkan dari log
(`core/tools/tally.ts`) dengan satu aturan: **peristiwa terakhir per aktor
menang**, karena memilih itu sakelar.

Menyimpan angka berarti menulis ulang undo, atribusi, mode telaah, dan hitungan
kontribusi satu per satu. Data contoh sengaja memuat kasus pembuktinya: Budi
memilih "Rombak silabus dulu", menariknya, lalu memilih "Gabungkan dua mata
kuliah". Penghitung yang disimpan akan salah di situ; turunan dari log tidak.

## Menambah alat baru

1. Tambah nilai ke `ToolKind` di `core/model/types.ts`.
2. Tambah baris di `TOOLS` (`core/tools/registry.ts`), lengkap dengan
   **skemanya sendiri**. Satu skema per alat, bukan satu skema untuk semua
   (D41) — skema kecil yang tepat itulah yang membuat constrained decoding
   mendarat.
3. Tambah cara menggambarnya di kanvas.
4. Kalau alat itu punya perintah sendiri, tambah perintah, peristiwa, kalimat
   narasi, dan bunyinya. Tanpa kalimat, operasinya tidak boleh ada (aturan 5).

Yang **tidak** boleh disentuh saat menambah alat: aturan 1 dan aturan 2. Kalau
sebuah alat butuh menyimpan koordinat atau butuh simpul dengan dua induk, alat
itu dirancang salah, bukan aturannya.

## Yang tidak bisa jadi pohon

Timer. Sisa detiknya bukan isi rapat, melainkan jam bersama. Tempatnya di kanal
kehadiran bersama kursor dan permintaan masuk.

Ujinya satu kalimat: **kalau seminggu lagi tidak ada gunanya dibaca, itu
kehadiran, bukan dokumen.**

## Batas dari bagian 12

Bagian 12 CLAUDE.md melarang manajemen tugas. Checklist di dalam satu rapat
aman. Begitu ada penanggung jawab, tenggat, dan pelacakan antar-ruang, itu sudah
produk lain dan tidak boleh dibangun di sini.
