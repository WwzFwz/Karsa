# dialogs

Dialog untuk setiap operasi, sehingga semua perubahan bisa dijalankan tanpa kanvas (aturan 6). Dialog yang dibuka ditentukan `state/dialogs/DialogProvider`, lalu `DialogHost` yang merendernya.

**Taruh di sini:** Dialog baru. Yang bekerja pada satu simpul masuk `node/`. Setelah itu tambahkan jenisnya di `DialogRequest` dan `DialogHost`.

**Bukan di sini:** Kerangka dialog umum (`shared/Dialog.tsx`), dialog khusus dasbor (`rooms/`).

| File | Isi |
| --- | --- |
| DialogHost.tsx | Merender dialog yang sedang dibuka |
| fields.tsx | Kolom judul dan tipe yang dipakai bersama |
| node/ | Dialog satu simpul: tambah, ubah, pindah, hubungkan, hapus |
| CommentDialog.tsx | Tulis komentar pada simpul |
| ShareDialog.tsx | Kode dan tautan ruang |
| ToolDialog.tsx | Jadikan simpul alat, atau kembalikan (D40) |
| ShapeDialog.tsx | Ganti bentuk kanvas |
| HelpDialog.tsx | Daftar pintasan papan ketik |
