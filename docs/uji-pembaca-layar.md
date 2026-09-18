# Uji pembaca layar

Aksesibilitas adalah klaim inti Karsa, dan sampai dokumen ini ditulis klaim itu
belum pernah **didengar** satu kali pun. Markup-nya benar dan itu sudah
diperiksa mesin; yang belum diperiksa adalah bunyinya.

Dokumen ini dua bagian. Bagian 1 adalah yang sudah bisa diperiksa tanpa manusia,
dan hasilnya per 18 September 2026. Bagian 2 adalah naskah yang harus dijalankan
orang, karena tidak ada cara mengotomatiskannya.

---

## 1. Yang sudah diperiksa mesin

Dijalankan langsung pada ruang `KUR-482` yang terbuka di peramban.

| Yang diperiksa | Hasil |
| --- | --- |
| `role="tree"` punya nama | lulus |
| Tepat satu `treeitem` yang bisa di-Tab (roving tabindex) | lulus, 1 dari 21 |
| Tiap `treeitem` punya `aria-level` | lulus |
| Tiap `treeitem` punya nama | lulus |
| `aria-expanded` pada simpul yang punya anak | lulus |
| Kontrol tanpa nama terakses | tidak ada |
| Kontrol yang tidak terjangkau papan ketik | tidak ada |
| Live region tersedia | ada, 3 |
| Ikon SVG yang terbaca tanpa makna | tidak ada |

**Dua yang gagal, dan sudah diperbaiki:**

1. **Seluruh halaman ruang hanya punya satu heading**, dan itu milik panel
   (`Jejak perubahan`). Menavigasi dengan tombol H — cara pertama sebagian besar
   pengguna pembaca layar mengenali halaman sebelum membaca apa pun — tidak
   membawa ke mana-mana. Nama ruang kini `h1`, tampil persis sama seperti
   sebelumnya.
2. **Landmark tidak bernama.** Ada dua `header` dan dua `aside`; NVDA
   menyebutkan keduanya sebagai "complementary landmark" tanpa pembeda. Sekarang
   masing-masing diberi nama: Bilah atas, Panel pemeriksa, Navigasi dan setelan.

**Batas pemeriksaan ini:** ia membaca DOM. DOM yang benar dan suara yang benar
bukan hal yang sama, dan seluruh alasan bagian 2 ada adalah karena selisih itu
tidak bisa ditebak.

---

## 2. Naskah untuk NVDA

Satu putaran, sekitar 20 menit. Jalankan di Windows dengan NVDA, Firefox atau
Chrome. **Catat apa yang terdengar, bukan apa yang seharusnya terdengar.**

Pasang NVDA dari nvaccess.org. `Insert` adalah tombol NVDA.

### Sebelum mulai

Matikan suara peristiwa dulu (`Ctrl+B`) supaya dua sumber bunyi tidak bertumpuk,
lalu nyalakan lagi di langkah 6 untuk menguji justru tumpukan itu.

### A. Masuk dan mengenali halaman

1. Buka `http://localhost:5173`. Isi nama, kode `KUR-482`.
2. Tekan `H` berulang. **Harus terdengar:** "Rapat Kurikulum Semester Genap,
   heading level 1". Kalau tidak ada heading sama sekali, perbaikan di bagian 1
   tidak sampai.
3. Tekan `D` berulang (landmark). **Harus terdengar:** Bilah atas, Navigasi dan
   setelan, main, Panel pemeriksa — masing-masing dengan namanya.

### B. Outline sebagai pohon

4. `Tab` sampai masuk ke outline. **Harus terdengar:** "tree" beserta namanya.
5. Panah bawah menyusuri simpul. **Harus terdengar per simpul:** jenisnya,
   judulnya, tingkat berapa, dan nomor ke berapa dari berapa.
6. Panah kanan/kiri pada simpul yang punya anak. **Harus terdengar:** "expanded"
   dan "collapsed".
7. **Pertanyaan yang sebenarnya:** apakah nomor posisi terdengar berguna, atau
   justru bertele-tele sampai orang mematikannya? Catat.

### C. Membuat sesuatu

8. Di simpul mana pun, tekan `Enter` untuk menyunting judul, ketik, `Enter`.
9. **Harus terdengar:** satu kalimat yang menyebut apa yang berubah.
10. **Ukur:** berapa lama jeda antara menekan Enter dan kalimat itu terdengar?
    Kalau lebih dari sekitar dua detik, antrean narasi (D7) terlalu lambat.
11. Tekan `Ctrl+Z`. **Harus terdengar:** kalimat pembatalan, bukan diam.

### D. Yang paling mungkin gagal — narasi menunggu jeda bicara

Ini bagian yang tidak bisa diperiksa mesin sama sekali, dan alasan D7 ada.

12. Tekan dan tahan tombol Bicara (atau `Spasi`), lalu bicara beberapa detik.
13. Sementara masih bicara, minta orang lain mengubah sesuatu, atau buka tab
    kedua dan ubah di sana.
14. **Harus terjadi:** narasi perubahan itu **menunggu** sampai Anda berhenti
    bicara, lalu terdengar. Kalau ia menyela di tengah kalimat Anda, aturan 9
    dilanggar dan `a11y/Announcer` perlu diperiksa.

### E. Telusur audio

15. Tekan `.` untuk mulai menelusur.
16. **Harus terjadi:** tiap simpul berbunyi sekali, nadanya naik-turun menurut
    kedalaman, lalu berhenti sendiri di ujung.
17. **Harus tidak terjadi:** macet di simpul pertama. Itu bug yang sudah dua
    kali muncul (D74, D77) dan hanya kelihatan di peramban.

### F. Suara dan bunyi bersamaan

18. Nyalakan lagi bunyi peristiwa (`Ctrl+B`).
19. Ulangi langkah D. **Pertanyaannya:** apakah earcon, narasi NVDA, dan suara
    Anda sendiri bisa dibedakan, atau bertabrakan jadi bubur?

### G. Mode Menyimak

20. Nyalakan Mode Menyimak dari dock.
21. **Harus terdengar:** pengumuman bahwa mikrofon terbuka dan nama harus
    disebut lebih dulu.
22. Bicara biasa tanpa menyebut "Karsa". **Harus terjadi:** tidak ada apa pun
    yang berubah di kanvas.
23. Sebut "Karsa, tambahkan gagasan pelatihan dosen". **Harus terjadi:** usulan
    muncul dan diumumkan.

---

## 3. Yang paling menentukan, dan paling sering dilewati

Putaran di atas dijalankan oleh orang yang baru menyalakan NVDA hari itu. Itu
menemukan kesalahan kasar dan **tidak** menemukan yang halus: apa yang membuat
sebuah halaman melelahkan setelah dua jam, mana yang bertele-tele, mana yang
terdengar sopan tapi tidak berguna.

Untuk itu tidak ada penggantinya selain menguji dengan orang yang memakai
pembaca layar setiap hari. Satu sesi satu jam dengan satu orang seperti itu
bernilai lebih daripada sepuluh putaran naskah ini.
