# dialogs/node

Dialog yang bekerja pada satu simpul. Masing-masing menjalankan tepat satu perintah lewat `run`.

**Taruh di sini:** Dialog untuk operasi baru pada satu simpul.

**Bukan di sini:** Dialog tingkat ruang (`dialogs/`).

| File | Isi |
| --- | --- |
| CreateDialog.tsx | Tambah simpul |
| RenameDialog.tsx | Ubah judul |
| KindDialog.tsx | Ubah tipe |
| StateDialog.tsx | Ubah status |
| NoteDialog.tsx | Catatan panjang |
| MoveDialog.tsx | Pindah induk, tanpa masuk sub-pohon sendiri (aturan 1) |
| RelateDialog.tsx | Relasi tambahan |
| DeleteDialog.tsx | Hapus, dengan pilihan untuk anak-anaknya |
