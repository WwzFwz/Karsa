# Karsa

Ruang kerja kolaboratif yang bisa dioperasikan tanpa tangan dan diikuti tanpa
mata. Konteks lengkap ada di [CLAUDE.md](CLAUDE.md).

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`, isi nama panggilan, gabung ke ruang contoh
`KUR-482`. Tanpa server, ruang tetap jalan dan tersimpan di perangkat ini.

Supaya beberapa perangkat berada di ruang yang sama, jalankan server di terminal
lain (Node 22+). Vite meneruskan `/sync` dan `/api` ke sana:

```bash
npm --prefix server install
npm run dev:server   # port 3000, data di server/data/karsa.sqlite
```

```bash
npm run check        # typecheck klien + server, batas impor, uji, eval
npm run smoke:sync -- ws://localhost:3000/sync   # dua klien lewat server sungguhan
npm run build        # bundel produksi; server menyajikannya dari dist/
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
| `src/app/` | Rute dan halaman. |
| `src/components/` | UI per fitur, `shared/` untuk yang dipakai bersama. |
| `src/state/` | Provider dan hook React; satu ruang = lima provider. |
| `src/services/` | Logika tanpa React: suara, penyedia model, ruang. |
| `src/store/` | `YjsDocStore`, IndexedDB, sambungan server, data contoh. |
| `src/core/` | Model, aturan, proyeksi pohon, command, peristiwa. Tidak mengimpor React. |
| `src/a11y/` | Antrean narasi, tabel pintasan, perilaku papan ketik yang dipakai bersama. |
| `src/audio/` | Audio bus dan earcon oscillator. |
| `server/` | Satu proses: NestJS + Hocuspocus + SQLite. |
| `docs/` | Model data, peta pintasan, kosakata bunyi. |

Arah impor dan catatan folder dijaga `scripts/check-boundaries.mjs`: tiap folder
di `components/`, `state/`, dan `services/` punya `README.md` yang menjelaskan apa
yang masuk ke sana.
