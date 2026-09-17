# state

Keadaan React: provider, hook, dan apa pun yang harus berlangganan perubahan. Komponen membaca ruang hanya lewat hook di sini.

**Taruh di sini:** Keadaan baru yang dibaca beberapa komponen, atau hook yang menghubungkan `services/` dan `store/` ke React.

**Bukan di sini:** Komponen (`components/`), logika yang bisa berjalan tanpa React (`services/`). Folder ini tidak mengimpor `components/`.

| File | Isi |
| --- | --- |
| room/ | Lima provider satu ruang |
| rooms/ | Masuk ruang, akses, dan ketukan di pintu |
| dialogs/ | Dialog mana yang sedang dibuka |
| shortcuts/ | Pintasan papan ketik global |
| theme.ts | Tema terang/gelap |
| useLang.ts | Render ulang saat bahasa keluaran berganti |
