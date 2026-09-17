# services

Logika aplikasi tanpa React: bisa diuji di Node dan dipakai dari provider mana pun.

**Taruh di sini:** Kode yang mengerjakan sesuatu (mikrofon, model, penyimpanan lokal, perhitungan) dan tidak perlu tahu soal render.

**Bukan di sini:** Aturan domain yang berlaku di semua perangkat (`core/`), dokumen Yjs dan sinkronisasi (`store/`). Folder ini tidak mengimpor React.

| File | Isi |
| --- | --- |
| voice/ | Mikrofon, Whisper, dan alur suara |
| ai/ | Daftar penyedia model |
| rooms/ | Daftar ruang dan permintaan masuk |
| summary/ | Hitungan kontribusi |
| identity.ts | Id aktor per perangkat (D75) |
