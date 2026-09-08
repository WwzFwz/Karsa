# Karsa

Ruang kerja kolaboratif yang bisa dioperasikan tanpa tangan dan diikuti tanpa
mata. Konteks lengkap ada di [CLAUDE.md](CLAUDE.md).

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`, isi nama panggilan, gabung ke ruang contoh
`KUR-482`.

```bash
npm run typecheck   # tsc
npm run build       # bundel produksi
```

## Status

Tahap rancangan antarmuka. **Data palsu di dalam memori.** Belum ada server,
sinkronisasi Yjs, Ollama, maupun pengenalan suara — semuanya digantikan tombol
dan data contoh. Yang sudah sungguhan sejak sekarang:

- navigasi papan ketik lengkap, bisa dipakai tanpa tetikus sama sekali
- outline memakai pola ARIA tree yang benar
- kanvas dan outline membaca proyeksi pohon yang sama
- tombol Bicara dan Telusur audio berukuran sama dan berdampingan

## Peta berkas

| Jalur | Isi |
| ----- | --- |
| `src/core/` | Model, aturan, proyeksi pohon, command, peristiwa. Tidak mengimpor React. |
| `src/store/` | `DocStore` sebagai satu-satunya antarmuka data, ditambah implementasi memori dan data contoh. |
| `src/a11y/` | Antrean narasi, tabel pintasan, perilaku papan ketik yang dipakai bersama. |
| `src/audio/` | Audio bus dan earcon oscillator. |
| `src/views/` | Tiga tampilan setara. Tidak saling mengimpor. |
| `src/features/` | Suara, kehadiran, komentar, ringkasan. |
| `src/pages/` | Enam halaman. |
| `docs/` | Model data, peta pintasan, kosakata bunyi. |

Dua aturan struktural yang dijaga: `core/` tidak boleh mengimpor React, dan
`views/` tidak boleh saling mengimpor. Kalau dua tampilan mulai saling impor,
prinsip tiga tampilan setara sudah bocor.
