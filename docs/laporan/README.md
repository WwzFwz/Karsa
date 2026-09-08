# Bahan laporan — Karsa

Isi folder ini, supaya tidak perlu dicari.

| Berkas | Isi |
| ------ | --- |
| [`lampiran-abc.md`](lampiran-abc.md) | Ringkasan produk, Lampiran A (use case), B (arsitektur AI), C (arsitektur web) |
| [`lampiran-d.md`](lampiran-d.md) | Lampiran D: rancangan antarmuka per halaman, gambar lalu paragraf |
| `img/` | 28 tangkapan layar untuk Lampiran D |

Semuanya ditulis dengan asumsi aplikasi sudah dipasang dan diskalakan
sebagaimana dirancang, jadi komponen server dan klaster dijelaskan sebagai
bagian sistem.

---

## Apa yang ada di `lampiran-abc.md`

**Ringkasan produk dan fitur** — bagian yang paling langsung bisa dipakai untuk
ringkasan eksekutif:

- Masalah yang dijawab dan celah yang belum digarap siapa pun
- Dua jalur masukan: teks dan papan ketik, lalu ucapan
- **Orkestrasi: dari kalimat menjadi alat yang tepat** — pembeda utamanya
- Satu model, tiga tampilan setara
- Alat rapat sebagai tata letak, bukan jendela
- Kolaborasi dan akses; mengikuti tanpa melihat; ringkasan kontribusi
- Tujuh hal yang membedakan

**Lampiran A** — tiga aktor yang berbeda **jalur akses**, bukan wewenang,
beserta tabel sepuluh kegiatan × tiga jalur yang tidak punya satu pun baris
yang cuma bisa ditempuh satu kolom.

**Lampiran B** — B.1 alur pemrosesan suara tujuh tahap, B.2 model yang dipakai
beserta alasannya, B.3 mekanisme di perangkat dan rencana cadangan berlapis,
B.4 penanganan ketidakpastian, **B.5 arsitektur multi-agent**.

**Lampiran C** — C.1 diagram arsitektur sistem, C.2 komponen antarmuka,
C.3 sinkronisasi antar peserta, C.4 penyimpanan dan keamanan, C.5 perangkat dan
kebutuhan minimum.

## Apa yang ada di `lampiran-d.md`

22 bagian, 28 gambar, diurutkan mengikuti **alur pemakaian** dan bukan daftar
halaman: masuk → daftar ruang → membuat ruang → kanvas → daftar perintah →
alat & templat → alat di kanvas → outline → **merekam → usulan menunggu →
konteks yang dikirim ke model** → peserta & ruang tunggu → komentar →
**tiga alat satu per satu** → **lima bentuk visual dari isi yang sama** →
**tiga cara menyembunyikan panel** → bagikan → pintasan → ringkasan →
pengaturan.

Format tiap bagian: gambar, lalu satu sampai tiga paragraf.

---

## Membuat ulang gambarnya

```
npm run dev      # di satu terminal
npm run shots    # di terminal lain
```

Menjalankan Chrome headless lewat DevTools Protocol, 1440×900, tema terang, dan
menulis ulang seluruh isi `img/`. Menambah adegan berarti menambah satu baris di
`SCENES` pada `scripts/shots.mjs` dan satu bagian di `lampiran-d.md`.

Gambar arsitektur untuk Lampiran C **tidak** ada di sini — sumbernya blok
Mermaid di `../architecture.md`, dan hasil render PNG-nya di `../img/`.

---

## Konteks lain yang mungkin dibutuhkan

Di luar folder ini, dan semuanya di `docs/`:

| Berkas | Kapan berguna |
| ------ | ------------- |
| `../architecture.md` | Detail teknis arsitektur, termasuk skalabilitas empat tahap dan perkiraan kapasitas |
| `../agent-design.md` | Rancangan lapisan agen yang belum dibangun, termasuk pengamat dinamika |
| `../agent.md` | Orchestrator yang sudah berjalan, beserta angka set ujinya |
| `../tools.md` | Kenapa alat itu tata letak di atas sub-pohon, dan cara menambah alat |
| `../rencana-implementasi.md` | Rencana menyeluruh P0–P5 lalu S1–S3 |
| `../status.md` | Sudah sampai mana purwarupanya hari ini, dan apa yang belum ada |
| `../../CLAUDE.md` | Sembilan aturan produk dan seluruh catatan keputusan |

Dua yang terakhir berguna kalau laporan perlu membedakan **yang sudah berjalan**
dari **yang dirancang**. Dokumen di folder ini sengaja menjelaskan sistem
sebagaimana dirancang, tanpa menandai mana yang masih purwarupa.
