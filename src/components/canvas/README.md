# canvas

Tampilan visual ruang: simpul, relasi, kursor agen, geser, perbesar, dan seret untuk memindah.

**Taruh di sini:** Sesuatu yang digambar di atas papan, misalnya jenis kartu alat baru atau penanda baru pada simpul.

**Bukan di sini:** Algoritma tata letak (`core/shape/`), operasi yang hanya bisa lewat kanvas (dilarang, D6). Setiap aksi kanvas harus punya padanan di outline dan papan ketik.

| File | Isi |
| --- | --- |
| CanvasView.tsx | Renderer SVG, tata letak, geser, perbesar, seret (D11, D28, D29, D34) |
| ToolCard.tsx | Kartu voting, retro, dan matriks (D40, D59) |
