# Kosakata bunyi

Sumber kebenarannya `src/audio/earcons.ts`. Semuanya oscillator Web Audio, tanpa
satu pun berkas audio. Narasi diserahkan kepada pembaca layar pengguna lewat
ARIA; aplikasi ini tidak punya mesin text-to-speech sendiri dan tidak boleh
punya.

## Tiga sumbu yang membawa arti

Bunyi peristiwa bukan hiasan. Tiga hal dapat didengar tanpa perlu dilatih:

| Sumbu | Arti |
| ----- | ---- |
| Arah nada | naik berarti sesuatu muncul, turun berarti sesuatu hilang |
| Tinggi nada | kedalaman di pohon; tiap tingkat turun dua semitone, jadi terdengar kira-kira di mana perubahan mendarat |
| Timbre | siapa pelakunya; tiap peserta memegang satu bentuk gelombang selama sesi |

Nada dasar 880 Hz, di atas pita bicara. Setiap bunyi di bawah 180 milidetik.

## Daftar

| Peristiwa | Bentuk | Alasan |
| --------- | ------ | ------ |
| Simpul ditambah | dua nada naik, 0 lalu +4 | pola paling sering, harus paling ringan |
| Simpul dihapus | dua nada turun, +4 lalu −3 | kebalikan yang menambah, tanpa perlu dihafal |
| Simpul dipindah | naik lalu kembali, 0 +5 0 | berpindah lalu mendarat |
| Judul diubah | dua nada rapat | perubahan kecil, bunyi kecil |
| Status tindakan | 0 lalu +7, kuint sempurna | terdengar tuntas |
| Hubungan dibuat | kuint sempurna serentak | dua hal berbunyi bersamaan karena dua hal terhubung |
| Komentar ditulis | 0 lalu −5 | menurun, tidak menuntut giliran bicara |
| Bentuk kanvas diganti | busur lebar 0 +5 +9 | mengubah kanvas semua orang, pantas menonjol |
| Pemindahan bertabrakan | sekon minor serentak, 130 ms | sengaja terdengar salah, karena memang salah |
| Draf siap | oktaf, 0 lalu +12 | undangan untuk memutuskan, bukan pemberitahuan |
| Ditolak aturan | sekon minor pendek | ditolak, bukan gagal |
| Simpul jadi alat | trinada, 0 +3 +7 | mengubah apa itu benda, bukan cuma isinya |
| Memilih | 0 lalu +7, sangat pendek | sering dan kolektif, jadi kecil dan naik |
| Menarik pilihan | +7 lalu 0 | kebalikan yang sama persis |
| Ada yang minta masuk | satu nada diulang, +7 lalu +7 | nada berulang itu bunyi mengetuk pintu |
| Permintaan diterima | trinada naik, 0 +4 +7 | bentuk paling mirip "kedatangan" |
| Permintaan ditolak | +2 lalu −5 | turun, dan tidak kembali ke nada awal |
| Seseorang bergabung | −5 lalu 0, lembut | naik: ada yang datang, lebih pelan dari simpul baru |
| Seseorang keluar | 0 lalu −5, lebih pelan | kebalikannya; mati dalam mode rapat |
| Seseorang menunjuk | satu ketukan tinggi, +12 | menunjuk itu sesaat, bukan benda |
| Perpindahan fokus | satu klik sangat pelan | hanya terdengar di mode telaah |
| Telusur audio | satu nada per simpul | tingginya menyatakan kedalaman |

## Profil bunyi

Inilah cara aturan 6 dan aturan 9 hidup berdampingan. Setiap fitur memancarkan
peristiwa ke audio bus, jadi setiap fitur memenuhi syarat "menghasilkan
peristiwa audio". Profil yang menentukan mana yang benar-benar terdengar.

| Profil | Isi | Dipakai saat |
| ------ | --- | ------------ |
| `silent` | tidak ada | bawaan bila pengguna mematikannya |
| `sparse` | hanya peristiwa penting | bawaan mode rapat |
| `full` | semua, termasuk perpindahan fokus | mode telaah |

Fitur tidak pernah boleh memanggil pemutar bunyi secara langsung. Kalau sebuah
fitur menabrak aturan ini, ia bisa berbunyi ketika seharusnya diam.

## Narasi

Narasi tidak keluar dari sini. Ia masuk ke antrean di `src/a11y/Announcer.tsx`,
menunggu penanda bicara padam, meredam ledakan perubahan menjadi satu kalimat,
lalu disuntikkan ke live region. `aria-live="polite"` saja tidak cukup: ia
menunggu jeda pembaca layar, bukan jeda manusia yang sedang bicara di rapat.
