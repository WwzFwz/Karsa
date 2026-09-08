# Rancangan multi-agent

Status: **rancangan**, belum dibangun kecuali yang ditandai SUDAH. Dokumen ini
yang diputuskan dulu sebelum kode ditulis, supaya yang dibangun bukan tumpukan
agen yang kebetulan jalan.

Yang sudah ada dijelaskan di `docs/agent.md`. Yang di sini adalah bentuk
lengkapnya.

---

## 1. Satu kalimat yang mengikat semuanya

> **Agen boleh mengusulkan apa saja. Agen tidak boleh memutuskan apa pun.**

Semua rancangan di bawah tunduk pada satu kalimat itu. Kanvas ini milik
bersama; sesuatu yang mendarat tanpa persetujuan bukan bantuan, melainkan
peserta rapat yang menyela dan tidak bisa ditegur.

Konsekuensinya, tiap keluaran agen wajib punya empat hal, dan tanpa salah
satunya fiturnya tidak masuk:

1. **Kalimat.** Satu kalimat Bahasa Indonesia (aturan 5).
2. **Gerbang.** Terapkan atau batalkan, bisa dijawab dengan suara (D4c).
3. **Tempat.** Kursor agen berdiri di tempat perubahan akan mendarat (D18, D22).
4. **Alasan.** Kenapa dia mengusulkan itu, terbaca sebelum dijawab.

---

## 2. Jalur lengkap: suara ke keputusan

```
                        beberapa orang, beberapa mikrofon
                                     |
   AudioWorklet (per orang) --> VAD --> ASR lokal --> transkrip + actorId
                                     |
                          +----------v-----------+
                          |  Penyusun konteks     |  <-- struktur, bukan gambar
                          +----------+-----------+
                                     |
                          +----------v-----------+
                          |    ORCHESTRATOR       |  SUDAH (rules + Ollama)
                          |  memilih rute & agen  |
                          +--+-----+------+------++
                             |     |      |      |
              +--------------+     |      |      +--------------+
              |                    |      |                     |
      +-------v------+  +----------v-+  +-v-----------+  +------v--------+
      | Penyusun     |  | Pemilih    |  | Penata      |  | Pengamat      |
      | struktur     |  | alat       |  | letak       |  | dinamika      |
      | SUDAH        |  | SUDAH      |  | (bag. 5)    |  | opsional, mati|
      +-------+------+  +----------+-+  +-+-----------+  +------+--------+
              |                    |      |                     |
              +--------+-----------+------+---------------------+
                       |
                +------v-------+
                |  RENCANA     |   satu bentuk, apa pun agennya
                +------+-------+
                       |
                +------v-------+
                | GERBANG      |   kursor agen di tempat mendarat
                | manusia      |   terapkan / batalkan / ubah
                +------+-------+
                       |
                +------v-------+
                |  command     |   satu pintu menuju data
                +--------------+
```

Yang tidak boleh berubah: **tidak ada panah yang melompati gerbang.**

---

## 3. Alat yang tidak diminta langsung

Ini yang kamu tanyakan, dan sudah setengah jalan.

Pengguna sering tidak menyebut alatnya. Dia bilang *"kita harus putuskan mana
yang duluan"*, bukan *"bikin voting"*. Sistem boleh menawarkan — dengan tiga
syarat yang membedakan menawarkan dari menyela:

| Syarat | Wujudnya |
| ------ | -------- |
| Keyakinan turun | Usulan tersirat maksimal 0.6, ditandai "perlu dilihat" |
| Kalimatnya berbeda | "Ini usulan, bukan keputusan" — bukan "Saya siapkan" |
| Boleh diabaikan | Diamkan saja, usulan hilang saat ucapan berikutnya |

Yang **tidak** boleh: menawarkan berkali-kali untuk hal yang sama. Sekali
ditolak, alat itu tidak ditawarkan lagi di sesi itu. Asisten yang bertanya dua
kali sudah bukan bertanya.

Status: rute `alat-diusulkan` **SUDAH**. Redaman "sekali ditolak, jangan tanya
lagi" belum.

---

## 4. Banyak orang, banyak masukan

Ini bagian yang paling sering dilupakan rancangan agen, dan paling menentukan di
produk ini.

**Masalahnya bukan volume, melainkan siapa.** Empat orang bicara berbarengan
menghasilkan empat transkrip, bukan satu. Menggabungkannya jadi satu aliran
membuang justru informasi yang paling berharga: siapa mengusulkan apa.

Aturan yang dipakai:

1. **Satu antrean per orang, bukan satu antrean per ruang.** Tiap transkrip
   membawa `actorId` sejak dari mikrofonnya. `DocEvent` sudah membawa `actorId`
   dan `inputPath` sejak P0 (D8) justru untuk ini.
2. **Draf itu milik pribadi.** Draf orang lain tidak pernah terlihat sebelum
   diterapkan. Yang terlihat cuma "Rina sedang menyiapkan sesuatu" — kehadiran,
   bukan isi.
3. **Bentrok diselesaikan seperti bentrok pindah**, bukan dengan agen. Kalau
   dua usulan menyentuh simpul yang sama, yang mendarat belakangan mendapat
   peringatan, bukan penolakan. Pemulihan siklus deterministik sudah ada (D10).
4. **Giliran bicara bukan urusan agen.** Menentukan siapa yang "menang" saat
   dua orang bicara adalah keputusan sosial. Sistem menampilkan keduanya dan
   diam.

Yang membuat ini bisa dikerjakan: satu ruang punya satu dokumen, dan semua yang
melintas cuma perubahan dokumen dan penanda kehadiran (bagian 7).

---

## 5. Penata letak: bukan agen

Sengaja ditulis di sini supaya tidak dibangun sebagai agen nanti.

**Peletakan simpul baru adalah algoritma, bukan penilaian.** Alasannya tiga, dan
semuanya keras:

- **Deterministik.** Bagian 10: tata letak inkremental yang menahan posisi
  simpul lama adalah salah satu dari tiga hal penentu rasa cepat. Model yang
  memutuskan letak berarti kanvas yang melompat berbeda tiap kali.
- **Cepat.** Peletakan terjadi tiap simpul. 2–3 detik per simpul mustahil.
- **Aturan 2.** Model yang "menaruh yang penting di kanan" persis sedang
  menyimpan makna di koordinat, dan makna itu hilang bagi persona B.

Yang **memang** urusan model, dan sudah ada namanya: **memilih bentuk visual**
(`suggestShape`) — peta gagasan, bagan kolom, garis waktu. Itu penilaian atas
isi, bukan atas piksel, dan hasilnya diusulkan, bukan diterapkan.

Ringkasnya: **peletakan = algoritma; pemilihan bentuk = usulan.** Jangan
ditukar.

Yang belum: `sizeOf` sudah mengukur tinggi kartu (D54), tapi belum ada penjaga
yang memastikan simpul baru mendarat di ruang kosong ketika kanvas sudah padat.
Itu pekerjaan tata letak, bukan agen.

---

## 6. Pengamat dinamika (opsional, mati secara bawaan)

Ini bagian yang kamu minta, dan bagian paling berbahaya di seluruh dokumen ini.

### Yang dia lakukan

Membaca dua hal yang sudah ada — jejak peristiwa di kanvas dan transkrip suara —
lalu mengenali pola kerja tim yang punya nama, dan **menawarkan alat** untuk
menanganinya.

| Pola yang dikenali | Dari mana | Yang ditawarkan |
| ------------------ | --------- | --------------- |
| Dua simpul `keputusan` bertentangan lewat relasi `contradicts` | kanvas | Tabel perbandingan |
| Satu simpul diubah bolak-balik oleh dua orang | jejak peristiwa | Voting |
| Suara terbelah rata pada sebuah voting | hitungan suara | Kriteria keputusan |
| Satu orang menyumbang jauh lebih sedikit | ringkasan kontribusi | *tidak ada* — lihat bawah |
| Satu pertanyaan tidak terjawab lama | umur simpul `pertanyaan` | Tempat parkir |

Alat baru yang dibutuhkannya: **tabel perbandingan** (opsi sebagai kolom,
kriteria sebagai baris) dan **kriteria keputusan** (daftar kriteria berbobot).
Keduanya sub-pohon biasa, seperti alat lain — kolom dan baris adalah simpul.

### Kenapa mati secara bawaan

Perbedaannya dengan agen lain: agen lain membaca **isi**, agen ini membaca
**orang**. Sistem yang memberi tahu satu ruangan bahwa dua orang sedang tidak
sepakat mengubah apa yang orang berani ucapkan di ruangan itu. Itu bukan
pertimbangan teknis dan tidak bisa dibereskan dengan tombol yang lebih baik.

Aturan yang mengikat:

1. **Mati sampai dinyalakan**, dan dinyalakan oleh manusia, bukan oleh
   heuristik.
2. **Berbicara tentang isi, bukan tentang orang.** "Dua keputusan ini
   bertentangan" boleh. "Rina dan Budi tidak sepakat" **tidak pernah**, meski
   itu yang terdeteksi.
3. **Tidak pernah menilai orang.** Baris "satu orang menyumbang lebih sedikit"
   sengaja tanpa usulan: seseorang bisa diam karena antarmukanya menghalangi
   dia, dan produk ini justru dibangun untuk orang itu. Menyorotnya adalah
   menyalahkan korban.
4. **Terlihat sedang menyala.** Lencana di bilah atas berubah, seperti penyedia
   awan (D24). Orang berhak tahu ada yang membaca dinamika ruangan.
5. **Satu tawaran per pola per sesi.** Ditolak berarti selesai.

Kalau lima aturan itu tidak bisa dipenuhi, agen ini tidak dibangun. Nilai
fiturnya tidak sebanding dengan ruang rapat yang orang-orangnya jadi
berhati-hati.

---

## 7. Daftar agen

| Agen | Membaca | Menghasilkan | Status |
| ---- | ------- | ------------ | ------ |
| **Orchestrator** | transkrip + konteks | rute, agen mana | SUDAH |
| **Penyusun struktur** | transkrip | perintah simpul & relasi | SUDAH |
| **Pemilih alat** | transkrip + daftar alat | langkah templat | SUDAH |
| **Perapi judul** | judul usulan | judul ≤ 60 karakter | terdaftar, belum jalan |
| **Penata letak** | — | — | **bukan agen**, lihat bagian 5 |
| **Pengamat dinamika** | jejak + transkrip | tawaran alat | rancangan, mati |

Semuanya menghasilkan `PlanStep` yang sama, dan tiap langkah membawa nama
agennya supaya bisa dibantah pada bagian yang salah saja.

---

## 8. Urutan pengerjaan

1. **Perapi judul dijalankan** — atau namanya dicabut dari `AGENTS`. Tahap
   bernama yang tidak pernah berjalan adalah kebohongan kecil di antarmuka.
2. **Redaman tawaran** — sekali ditolak, jangan tawarkan lagi.
3. **Kursor agen untuk langkah templat** — belum ada simpul untuk ditunjuk
   sebelum templat mendarat; ini lubang D18 yang tersisa.
4. **Alat tabel perbandingan** — berguna sendirian, tanpa pengamat dinamika.
5. **Konteks per orang** — `actorId` mengalir dari mikrofon sampai draf.
6. **Pengamat dinamika**, terakhir, kalau kelima aturan bagian 6 terpenuhi.

Nomor 4 sengaja sebelum nomor 6: alat perbandingan harus berguna ketika diminta
manusia sebelum ada agen yang menawarkannya. Alat yang cuma masuk akal karena
sebuah agen menyodorkannya adalah alat yang belum terbukti.
