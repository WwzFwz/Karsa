# services/rooms

Ruang di luar dokumennya: daftar ruang, membuat ruang, masuk, dan ruang tunggu. Dua mode dengan satu antarmuka: lewat server (biasa), atau hanya di perangkat ini bila `VITE_SYNC_URL=off`.

**Taruh di sini:** logika ruang yang tidak butuh React, misalnya panggilan baru ke room service.

**Bukan di sini:** isi ruang (`store/`), tampilan (`components/rooms/`), hook yang menyambungkannya ke React (`state/rooms/`).

| File | Isi |
| --- | --- |
| rooms.ts | Daftar, info, buat, ganti akses; mode server atau lokal |
| joining.ts | Masuk, mengetuk, menunggu, dan menjawab ketukan (D37, D79) |
| membership.ts | Kode ruang milik perangkat ini dan token masuknya |
| api.ts | Panggilan ke room service; galat jadi kalimat |
