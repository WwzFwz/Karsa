# components

Semua potongan antarmuka (UI). Halaman di `app/pages/` merakitnya; logika dan keadaan tinggal di `services/` dan `state/`.

**Taruh di sini:** Komponen React baru. Pilih subfolder menurut fitur yang memakainya. Dipakai dua fitur atau lebih: `shared/`.

**Bukan di sini:** Keadaan ruang atau hook provider (`state/`), logika tanpa React (`services/`), aturan domain (`core/`). Komponen tidak mengimpor `store/` langsung.

| File | Isi |
| --- | --- |
| canvas/ | Kanvas visual dan kartu alat |
| outline/ | Outline pohon ARIA |
| voice/ | Bicara ke asisten: dock, transkrip, usulan, pertanyaan |
| dialogs/ | Semua dialog operasi |
| layout/ | Kerangka ruang: bilah atas, navigasi kiri |
| commands/ | Palet perintah Ctrl+K |
| rooms/ | Dasbor dan ruang tunggu |
| presence/ | Panel peserta |
| comments/ | Panel komentar |
| summary/ | Jejak peristiwa |
| tools/ | Rel alat dan templat |
| shared/ | Dipakai di banyak tempat |
