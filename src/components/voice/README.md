# voice

Semua UI yang dipakai orang untuk berbicara dengan asisten: menyalakan mikrofon, melihat apa yang didengar, meninjau usulan, dan menjawab pertanyaan.

**Taruh di sini:** Komponen yang tampil selama alur suara atau perintah ketik berlangsung, misalnya indikator baru untuk transkrip atau cara baru menjawab usulan.

**Bukan di sini:** Logika alur suara (`services/voice/`), keadaan draf (`state/room/AssistantProvider`), komponen yang dipakai di luar alur suara (`shared/`).

| File | Isi |
| --- | --- |
| VoiceDock.tsx | Dock bawah: Bicara, Telusur audio, status agen (D17) |
| DraftPanel.tsx | Panel pemeriksaan: yang didengar, usulan, perintah ketik (D68) |
| QuestionCard.tsx | Pertanyaan bernomor + jawaban bebas (D71) |
| AgentCursor.tsx | Kursor asisten di kanvas (D22) |
