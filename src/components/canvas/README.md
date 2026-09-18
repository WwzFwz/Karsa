# canvas

Tampilan visual ruang: simpul, relasi, kursor agen, geser, perbesar, dan seret untuk memindah.

**Taruh di sini:** Sesuatu yang digambar di atas papan, misalnya jenis kartu alat baru atau penanda baru pada simpul.

**Perhitungan bukan hook.** Berkas berawalan `use` boleh memanggil hook lain dan karenanya terikat daur hidup React. Yang cuma menghitung — geometri, jarak, posisi — ditulis sebagai fungsi biasa (`viewport.ts`), supaya bisa diuji di Node tanpa peramban. Mengubah perhitungan jadi hook cuma karena ia kebetulan keluar dari sebuah komponen adalah cara termudah membuatnya tidak bisa diuji lagi.

**Bukan di sini:** Algoritma tata letak (`core/shape/`), operasi yang hanya bisa lewat kanvas (dilarang, D6). Setiap aksi kanvas harus punya padanan di outline dan papan ketik.

| File | Isi |
| --- | --- |
| CanvasView.tsx | Merakit papan: tata letak, geser, perbesar, seret (D11, D28, D29, D34) |
| NodeCard.tsx | Satu kartu simpul, termasuk kalimat yang dibaca pembaca layar |
| ToolCard.tsx | Kartu voting, retro, dan matriks (D40, D59) |
| Edges.tsx | Lapisan garis: pohon, relasi, dan garis yang sedang ditarik |
| GhostCard.tsx | Pratinjau papan yang diusulkan, sebelum disetujui (D83) |
| viewport.ts | Fungsi biasa: mengukur chrome mengambang, menghitung gulir (D30) |
| viewport.test.ts | Uji perhitungan gulir, tanpa peramban |
| useFocusInView.ts | Menjaga simpul terfokus tetap terlihat (D19), dan efeknya |
