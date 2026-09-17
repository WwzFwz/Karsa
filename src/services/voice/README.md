# services/voice

Dari suara sampai usulan: membuka mikrofon, Whisper di Worker, memahami kalimat, dan alur satu orang dari bicara sampai terapkan.

**Taruh di sini:** Logika suara baru, misalnya VAD atau cara baru membaca jawaban.

**Bukan di sini:** Tampilan (`components/voice/`), orchestrator dan prompt model (`core/agent/`).

| File | Isi |
| --- | --- |
| flow.ts | Alur suara per perangkat; permintaan terbaru menang (D74) |
| flow.test.ts | Uji alur dengan mikrofon, model, dan jam palsu |
| speech.ts | Mikrofon lewat AudioWorklet, mode ASR, bahasa ucapan (D65) |
| asr.worker.ts | Whisper di Web Worker, WebGPU atau WASM |
| pipeline.ts | Kalimat menjadi draf lewat penyedia yang dipilih |
| answers.ts | Membaca "ya", "batal", dan "yang kedua" |
| types.ts | Draf, operasi, dan pertanyaan |
