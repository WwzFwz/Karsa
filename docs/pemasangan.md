# Pemasangan

Satu image, dua pemasangan. Bagian 7 CLAUDE.md menjanjikan bahwa **mode kelas
dan mode ter-deploy adalah kode yang sama dengan konfigurasi berbeda**, dan
dokumen ini adalah konfigurasi itu. Kalau suatu hari keduanya butuh image yang
berbeda, janjinya yang rusak, bukan dokumennya.

---

## Ringkasnya

```bash
docker build -t karsa .
docker run -d -p 3000:3000 \
  -e KARSA_SECRET="$(openssl rand -hex 32)" \
  -v karsa-data:/data \
  karsa
```

Buka `http://localhost:3000`. Sudah itu saja: klien, room service, dan
sinkronisasi dokumen ada di satu proses di balik satu port (D2).

Dengan Compose:

```bash
KARSA_SECRET="$(openssl rand -hex 32)" docker compose up -d
```

---

## `KARSA_SECRET` — satu-satunya yang wajib

Ini yang menandatangani token masuk ruang. **Tanpa itu server menolak menyala di
produksi**, dan penolakan itu disengaja: tanpa rahasia, siapa pun bisa membuat
token untuk ruang mana pun, dan ruang terkunci berhenti berarti apa-apa (D79).

Simpan nilainya. Menggantinya membuat semua token yang beredar tidak berlaku,
jadi semua orang harus masuk ulang lewat pintu ruang.

## Apa yang harus bertahan

Satu berkas: **`/data/karsa.sqlite`**. Isi setiap ruang ada di situ. Sisanya di
dalam kontainer bisa dibangun ulang dari repositori ini.

Ketukan ruang tunggu **tidak** ikut tersimpan — itu kehadiran, bukan dokumen,
dan ia memang hilang saat server dinyalakan ulang (D37, D79).

## Semua yang bisa diatur

Yang dibaca server dari lingkungan:

| Variabel | Bawaan | Isinya |
| --- | --- | --- |
| `KARSA_SECRET` | — | Penanda tangan token. Wajib di produksi. |
| `KARSA_DATA` | `/data/karsa.sqlite` di image | Berkas SQLite. |
| `KARSA_TOKEN_DAYS` | `30` | Masa berlaku token masuk. |
| `KARSA_MODELS` | kosong | Folder model ucapan, disajikan di `/models`. |
| `KARSA_STATIC` | `../dist` | Hasil build klien. |
| `PORT` | `3000` | — |

Yang dibaca klien **saat dibangun** (`VITE_*`, lihat `.env.example`) dan bisa
diganti per perangkat lewat halaman Pengaturan tanpa membangun ulang (D72):
alamat Ollama, nama model, `VITE_SYNC_URL`, `VITE_API_URL`, `VITE_MODEL_URL`,
dan ketiga model Whisper.

---

## Mode kelas: tanpa internet sama sekali

Yang membuat ini tidak berjalan di ruang tanpa jaringan cuma satu hal: **model
ucapan diambil dari Hugging Face**. Siapkan sendiri, lalu arahkan ke sana.

```bash
npm run models                 # sekali, di mesin yang punya internet
```

Lalu bangun klien dengan `VITE_MODEL_URL=/models`, pasang foldernya, dan
nyalakan `KARSA_MODELS`:

```bash
docker run -d -p 3000:3000 \
  -e KARSA_SECRET="$(cat secret.txt)" \
  -e KARSA_MODELS=/models \
  -v karsa-data:/data \
  -v "$PWD/server/models:/models:ro" \
  karsa
```

Runtime ONNX-nya sudah ikut di dalam image — disalin dari `node_modules` saat
membangun, bukan diambil dari CDN (D81). Ini lubang kedua yang sempat luput:
sebuah ruang bisa punya seluruh berkas model di servernya sendiri dan tetap
tidak mendengar apa pun, karena yang membaca berkas itu diambil dari seberang
internet.

**Model bahasanya terpisah.** Ollama berjalan di mesin masing-masing pendengar,
bukan di server (D72). Halaman boleh disajikan dari server sementara modelnya
tetap di `localhost` setiap orang.

## Ter-deploy: yang perlu diperhatikan

**HTTPS.** Halaman `https` tidak boleh memanggil `http://localhost:11434`, jadi
Ollama tidak terjangkau dari halaman yang disajikan lewat TLS kecuali pendengar
mengatur sendiri. Halaman Pengaturan menyebut penyebabnya satu per satu, jadi
gejalanya tidak muncul sebagai "gagal" tanpa keterangan (D72).

**`OLLAMA_ORIGINS`.** Ollama menolak asal yang tidak dikenalnya. Pasang asal
halaman di situ.

**WebSocket.** Sinkronisasi memakai `/sync`. Proxy apa pun di depan harus
meneruskan upgrade WebSocket, atau ruangnya jalan tapi tidak pernah tersambung.

**Satu instans.** Hocuspocus di sini tanpa Redis, jadi dua instans tidak saling
mengenal. Jalur ke banyak instans ada di `docs/architecture.md` dan sengaja
belum dibangun (D2).

---

## Yang belum

- **Belum pernah dijalankan di mesin selain mesin pengembang.** Dockerfile,
  Compose, dan CI ditulis dan diperiksa per bagian — jalur `../dist`, mode
  produksi dengan `NODE_ENV=production`, perintah healthcheck yang sama persis —
  tetapi `docker build` sendiri belum pernah selesai sekali pun di sini karena
  daemon-nya tidak menyala. Pemeriksaan pertama yang sungguhan adalah pekerjaan
  `image` di CI.
- **Tidak ada publikasi image.** CI membangun dan berhenti di situ; ke mana ini
  di-hosting belum diputuskan.
- **Tidak ada backup otomatis.** Salin `/data/karsa.sqlite`.
