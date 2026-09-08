# Model Data Karsa

Satu halaman. Belum diimplementasikan; ini yang harus disepakati sebelum UI
dibangun, supaya tampilannya tidak lahir dengan asumsi yang cuma cocok untuk mata.

Aturan pemandu: pohon adalah kebenaran (aturan 1), koordinat tidak menyimpan apa
pun (aturan 2), semua isi bertipe (aturan 3), setiap perubahan punya nama
(aturan 5).

---

## A. Tujuh elemen

Tiga disinkronkan, satu efemeral, satu lokal murni, dua turunan.

| Elemen        | Tempat tinggal            | Kenapa di situ |
| ------------- | ------------------------- | -------------- |
| `Room`        | Yjs `Y.Map`               | metadata ruang |
| `Node`        | Yjs `Y.Map<NodeId, Node>` | **flat**, bukan bersarang - lihat B |
| `Relation`    | Yjs `Y.Map<RelId, Rel>`   | hubungan yang bukan induk-anak |
| `Comment`     | Yjs `Y.Map<CmtId, Cmt>`   | menempel pada node atau relation |
| `Event`       | Yjs `Y.Array<Event>`      | log tambah-saja, sumber narasi + bunyi + kontribusi |
| `Participant` | Yjs **Awareness**         | efemeral, tidak pernah masuk dokumen |
| `Draft`       | memori lokal              | tidak pernah disinkronkan, milik penuturnya |

### 1. `Node` - satu-satunya unit isi bermakna

```ts
interface Node {
  id: NodeId              // ULID, monoton, dipakai juga untuk tie-break siklus
  parentId: NodeId | null // null = akar. SATU field, LWW. Ini aturan 1.
  order: string           // fractional index di antara saudara sekandung
  kind: NodeKind          // aturan 3
  title: string           // <= 60 karakter, aturan 4
  note?: string           // uraian panjang. Tidak muncul di kanvas, dibaca di outline.
  state?: NodeState       // hanya bermakna untuk kind 'action' | 'decision'
  createdBy: ActorId
  createdAt: number
  updatedBy: ActorId
  updatedAt: number
  inputPath: InputPath    // 'keyboard' | 'voice' | 'pointer' - bahan P5
}

type NodeKind  = 'root' | 'idea' | 'step' | 'decision' | 'question'
               | 'fact' | 'action' | 'group'
type NodeState = 'open' | 'doing' | 'done' | 'blocked'
type InputPath = 'keyboard' | 'voice' | 'pointer' | 'system'
```

**Wajib:** `id`, `parentId`, `order`, `kind`, `title`, keempat field jejak, dan
`inputPath`.

**Tidak ada dan tidak boleh ditambahkan:** `x`, `y`, `width`, `height`, `color`,
`shape`, `collapsed`, `zIndex`. Semua itu turunan tampilan atau keadaan lokal per
orang, bukan isi bersama. Ini yang membuat pergantian bentuk visual aman.

> `note` sengaja dipisah dari `title` supaya aturan 4 tidak memaksa orang
> membuang informasi. Judul untuk disebut, catatan untuk dibaca.

### 2. `Relation` - hubungan yang tidak memindahkan simpul

```ts
interface Relation {
  id: RelId
  fromId: NodeId
  toId: NodeId
  kind: RelationKind
  label?: string          // <= 40 karakter, opsional
  createdBy: ActorId; createdAt: number; inputPath: InputPath
}

type RelationKind = 'depends_on' | 'causes' | 'contradicts'
                  | 'refers_to'  | 'duplicates' | 'sequence'
```

Berarah, boleh melintasi cabang, **boleh membentuk siklus** - siklus di sini tidak
berbahaya karena bukan pohon. Di outline ia dibaca sebagai atribut simpul
("bergantung pada: Anggaran"), bukan sebagai baris tersendiri. Ini yang menjaga
outline tetap pohon.

### 3. `Comment`

```ts
interface Comment {
  id: CmtId
  targetType: 'node' | 'relation'
  targetId: string
  replyToId?: CmtId       // satu tingkat balasan saja
  body: string
  authorId: ActorId; createdAt: number
  resolvedAt?: number; resolvedBy?: ActorId
}
```

### 4. `Event` - tulang punggung yang belum disebut di rencana awal

Aturan 5 menuntut setiap operasi menghasilkan peristiwa yang dapat dinarasikan
dalam satu kalimat. Peristiwa itu perlu tempat tinggal.

```ts
interface DocEvent {
  id: EvtId
  seq: number
  at: number
  actorId: ActorId
  inputPath: InputPath
  type: EventType         // sama persis dengan daftar operasi mengubah di bagian D
  payload: Record<string, unknown>   // cukup untuk menarasikan tanpa membaca doc
  origin: 'user' | 'system'          // 'system' untuk pemulihan siklus
}
```

Satu struktur ini melayani **empat** fitur sekaligus, sehingga tidak perlu empat
mekanisme terpisah:

- **bunyi peristiwa** (P4) - `type` dipetakan ke earcon
- **narasi ARIA** (P0) - `narrate(event): string`, satu kalimat Bahasa Indonesia
- **penelusuran waktu / mode telaah** (P4) - log dibaca mundur
- **ringkasan kontribusi** (P5) - hitung per `actorId` dan `inputPath`

Karena itu `actorId` dan `inputPath` **harus ada sejak P0**. Menambahkannya
belakangan berarti sesi-sesi awal tidak punya atribusi.

### 5. `Participant` - Awareness saja

```ts
interface Participant {
  clientId: number
  actorId: ActorId
  displayName: string
  hue: number
  talking: boolean              // dari sakelar tekan-tahan, bukan mikrofon selalu hidup
  focusNodeId: NodeId | null    // kursor logis orang itu
  pointingNodeId: NodeId | null // "yang ini" - SEBUAH ID, bukan koordinat
  mode: 'meeting' | 'review'
  lastSeen: number
}
```

`pointingNodeId` adalah keputusan model data yang paling penting untuk persona B.
Menunjuk direkam sebagai **rujukan simbolik**, bukan posisi kursor. Akibatnya
"yang ini" dapat diungkapkan ke ketiga tampilan sekaligus: sorotan di kanvas,
`aria-describedby` di outline, dan earcon berarah di audio. Kursor x/y tidak bisa
melakukan itu, dan mengirimnya juga melanggar aturan 2.

### 6. `Draft` - lokal, tidak pernah disinkronkan (aturan 8)

```ts
interface Draft {
  id: DraftId
  transcript: string
  ops: Command[]                       // hasil validator, siap diterapkan
  rejected: { raw: string; reason: string }[]
  ambiguities: { question: string; choices: DraftChoice[] }[]
  status: 'listening' | 'thinking' | 'ready' | 'applied' | 'discarded'
}
```

### 7. Turunan - fungsi murni, tidak disimpan

| Fungsi | Hasil |
| ------ | ----- |
| `tree(doc)` | hutan kanonik + hasil pemulihan siklus |
| `outline(tree)` | baris ARIA tree yang sudah rata beserta `aria-level` |
| `suggestShape(doc)` | bentuk visual dari histogram `kind` + `RelationKind` |
| `positions(tree, shape)` | ELK, **lokal saja, tidak pernah dikirim** |

`suggestShape` contoh awal: mayoritas `step` + relasi `sequence` -> diagram alur;
mayoritas `idea` -> peta gagasan; `fact` bertanggal -> garis waktu; `group` di
tingkat 1 -> bagan kolom. Bentuk adalah **usul**; nilai final disimpan di
`Room.shape` supaya semua orang melihat hal yang sama, dan mengubahnya adalah
operasi mengubah data yang dinarasikan.

---

## B. Kenapa `Node` datar dan `parentId` sebuah field tunggal

Rencana awal benar mengidentifikasi risiko siklus Yjs. Bentuk penyimpanan
menentukan seberapa mahal penanganannya.

- Anak sebagai `Y.Array` di dalam induk: memindahkan = hapus + sisip. Dua orang
  memindahkan simpul yang sama menghasilkan **dua salinan**. Lebih buruk daripada
  siklus.
- `parentId` sebagai field LWW tunggal: pindah bersilangan paling buruk
  menghasilkan **siklus**, tidak pernah duplikat dan tidak pernah kehilangan
  simpul. Siklus bisa dideteksi dan dipulihkan secara deterministik. Duplikat
  tidak bisa.

Urutan saudara sekandung memakai **fractional index** (`order: string`) supaya
menyisipkan di antara dua simpul tidak perlu menyentuh simpul lain.

### Pemulihan siklus sebagai proyeksi, bukan mutasi

Perbaikan dijalankan saat **membaca**, bukan saat menulis:

1. `tree(doc)` menelusuri `parentId` setiap simpul.
2. Bila menemukan siklus, ambil simpul dengan `id` terkecil secara leksikografis
   di dalam siklus itu, dan perlakukan induknya sebagai `null` untuk pembacaan
   ini.
3. Pancarkan `cycleResolved` ke audio bus dan aria-live.

Karena aturannya sama di semua perangkat dan tidak ada tulisan yang terjadi,
**dokumen yang bersiklus tidak pernah tampak rusak di mana pun**, bahkan sebelum
ada yang memperbaikinya. Penulisan balik ke dokumen dilakukan belakangan, sekali,
oleh klien dengan `clientId` terkecil, bersifat idempoten. Kalau penulisan itu
gagal atau tidak pernah terjadi, tidak ada yang celaka.

Inilah wujud "pembatalan adalah perilaku yang dirancang, bukan kerusakan".

---

## C. Jenis relasi - ringkasan

| Jenis | Sifat | Bisa siklus? | Muncul di outline sebagai |
| ----- | ----- | ------------ | ------------------------- |
| induk-anak (`parentId`) | pohon, wajib, tepat satu | tidak (dipulihkan) | struktur bertingkat |
| `Relation` | graf berarah, opsional, banyak | ya, tidak apa-apa | atribut pada baris simpul |
| `Comment.targetId` | tempelan, banyak-ke-satu | tidak berlaku | jumlah + panel terpisah |
| `Participant.pointingNodeId` | efemeral, satu per orang | tidak berlaku | `aria-describedby` sementara |

---

## D. Operasi yang MENGUBAH data

Menghasilkan `DocEvent`, disinkronkan, dinarasikan satu kalimat, punya earcon,
masuk hitungan kontribusi. Semuanya wajib bisa dijalankan lewat papan ketik.

| Operasi | Kalimat narasinya |
| ------- | ----------------- |
| `createNode` | "Rina menambahkan gagasan Anggaran di bawah Riset." |
| `renameNode` | "Budi mengubah judul Anggaran menjadi Anggaran 2026." |
| `setNodeKind` | "Rina mengubah Anggaran menjadi keputusan." |
| `setNodeState` | "Budi menandai Hubungi vendor selesai." |
| `setNodeNote` | "Rina menyunting catatan pada Anggaran." |
| `moveNode` | "Budi memindahkan Anggaran ke bawah Keuangan." |
| `reorderNode` | "Rina memindahkan Anggaran ke urutan kedua." |
| `deleteNode` | "Budi menghapus Anggaran beserta 3 turunannya." |
| `addRelation` | "Rina menghubungkan Anggaran bergantung pada Riset." |
| `removeRelation` | "Budi melepas hubungan Anggaran dan Riset." |
| `relabelRelation` | "Rina memberi label menunggu pada hubungan itu." |
| `addComment` | "Budi berkomentar pada Anggaran." |
| `resolveComment` | "Rina menyelesaikan komentar pada Anggaran." |
| `setRoomTitle` | "Budi mengubah nama ruang menjadi Rapat Kurikulum." |
| `setRoomShape` | "Rina mengubah bentuk kanvas menjadi diagram alur." |
| `cycleResolved` (sistem) | "Perpindahan bertabrakan. Anggaran dikembalikan ke akar." |

Uji kelayakan operasi baru: **kalau kalimatnya tidak bisa ditulis, operasinya
tidak boleh ada.** Ini aturan 5 dalam bentuk yang bisa dijalankan.

## E. Operasi NAVIGASI saja

Tidak menghasilkan `DocEvent`, tidak disinkronkan (kecuali `focusNodeId` dan
`pointingNodeId` yang lewat Awareness), tidak masuk hitungan kontribusi, tidak
berbunyi kecuali umpan balik pergerakan yang sangat pelan.

`focusNode`, `moveFocus(parent|firstChild|nextSibling|prevSibling)`,
`expandNode`, `collapseNode`, `pointAt`, `clearPointing`, `switchView`,
`zoomPan`, `filterByKind`, `search`, `startAudioTraversal`, `stopAudioTraversal`,
`setSoundProfile`, `setMode(meeting|review)`, `openPanel`, `closePanel`.

### Garis pemisahnya

> **Kalau tindakan itu mengubah apa yang akan dibacakan pembaca layar orang lain,
> ia mengubah data. Kalau tidak, ia navigasi.**

`collapseNode` adalah navigasi karena melipat di layar saya tidak melipat di
layar Anda. `setRoomShape` adalah perubahan data karena semua orang harus melihat
dan mendengar bentuk yang sama.

---

## F. Yang sengaja belum diputuskan

1. **Batas judul 60 atau 80.** Satu tarikan napas Bahasa Indonesia kira-kira 8-12
   kata; 60 karakter lebih dekat ke sana daripada 80. Perlu keputusan pemilik
   proyek.
2. **`deleteNode` pada simpul beranak** - hapus berantai atau naikkan anak ke
   kakek. Usul: naikkan anak ke kakek secara bawaan (tidak ada isi hilang tanpa
   sengaja), hapus berantai hanya lewat konfirmasi eksplisit.
3. **Apakah `Room.shape` boleh otomatis berubah** tanpa persetujuan. Usul: sistem
   mengusulkan, seseorang menerapkan. Bentuk yang berganti sendiri saat orang
   sedang menelusuri adalah mimpi buruk bagi persona B.
