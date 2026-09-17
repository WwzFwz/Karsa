# state/rooms

Hook yang menghubungkan layanan ruang ke React: melewati pintu ruang, akses ruang yang sedang dibuka, dan ketukan di pintunya.

**Taruh di sini:** keadaan tentang ruang sebagai tempat (siapa boleh masuk), bukan tentang isinya.

**Bukan di sini:** isi ruang (`state/room/`), panggilan HTTP (`services/rooms/`).

| File | Isi |
| --- | --- |
| useRoomEntry.ts | Memeriksa kode, masuk, atau menunggu diterima |
| useRoomAccess.ts | Terkunci atau terbuka, diperbarui saat anggota lain mengubahnya |
| useJoinRequests.ts | Ketukan yang menunggu dan jawabannya, dari sinyal server |
