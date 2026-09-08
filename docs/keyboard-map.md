# Peta pintasan papan ketik

Sumber kebenarannya `src/a11y/keys.ts`. Lembar bantuan di dalam aplikasi (tekan
`?`) membaca tabel yang sama, jadi dokumen ini tidak bisa menyimpang dari
perilakunya.

Pintasan satu huruf hanya aktif ketika fokus berada di sebuah simpul, tidak
pernah saat sedang mengetik di kolom teks.

## Di mana saja

| Tombol | Fungsi |
| ------ | ------ |
| `?` | Buka daftar pintasan |
| `Ctrl` `K` | Buka daftar perintah |
| `1` | Pindah ke kanvas |
| `2` | Pindah ke outline |
| `3` | Pindah ke panel perintah |
| `Spasi` | Ketuk untuk mengunci mikrofon, atau tahan selama bicara |
| `.` | Mulai atau hentikan telusur audio |
| `Ctrl` `M` | Ganti mode rapat dan mode telaah |
| `Ctrl` `B` | Nyalakan atau matikan bunyi |
| `[` | Sembunyikan atau tampilkan navigasi kiri |
| `]` atau `\` | Sembunyikan atau tampilkan panel kanan |
| `a` | Buka alat dan templat |
| `f` | Kanvas layar penuh |
| `Escape` | Keluar dari layar penuh |
| `Ctrl` `Z` | Batalkan perubahan terakhir |
| `Ctrl` `+` | Perbesar kanvas |
| `Ctrl` `-` | Perkecil kanvas |
| `Ctrl` `0` | Kembalikan perbesaran ke 100 persen |
| `Ctrl` `Enter` | Terapkan usulan agen |
| `Escape` | Tolak usulan agen |

## Saat fokus di sebuah simpul

Navigasi mengikuti pola ARIA tree. Tidak ada yang mengubah data.

| Tombol | Fungsi |
| ------ | ------ |
| `Panah bawah` | Ke baris berikutnya |
| `Panah atas` | Ke baris sebelumnya |
| `Panah kanan` | Buka cabang, lalu ke anak pertama |
| `Panah kiri` | Tutup cabang, lalu ke induk |
| `Home` | Ke baris pertama |
| `End` | Ke baris terakhir |
| `p` | Tunjuk simpul ini untuk semua orang |

Yang berikut mengubah data. Semuanya menghasilkan peristiwa, kalimat narasi, dan
bunyi pendek.

| Tombol | Fungsi |
| ------ | ------ |
| `n` | Tambah simpul anak |
| `Shift` `N` | Tambah simpul saudara |
| `Enter` | Ubah judul |
| `t` | Ubah tipe simpul |
| `s` | Ubah status tindakan |
| `e` | Sunting catatan |
| `m` | Pindahkan ke induk lain |
| `Alt` `Panah atas` | Naikkan urutan |
| `Alt` `Panah bawah` | Turunkan urutan |
| `r` | Hubungkan ke simpul lain |
| `l` | Jadikan simpul ini sebuah alat |
| `v` | Pilih, atau tarik pilihan |
| `c` | Tulis komentar |
| `Delete` | Hapus simpul |

## Saat draf perintah terbuka

| Tombol | Fungsi |
| ------ | ------ |
| `Ctrl` `Enter` | Terapkan draf ke kanvas bersama |
| `Escape` | Batalkan draf |

## Catatan rancangan

`m` untuk memindahkan bukan kompromi karena seret-lepas belum sempat dibuat.
Tidak ada seret-lepas sama sekali, dan itu keputusan: letak di layar tidak
menyimpan makna (aturan 2), sehingga menyeret hanya akan menjadi gerakan yang
tidak mengubah apa pun. Kalau ia dibuat mengubah sesuatu, pengguna yang tidak
bisa memakai tetikus langsung terkunci — persis kegagalan yang produk ini
lawan.
