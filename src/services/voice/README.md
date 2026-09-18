# services/voice

Dari suara sampai usulan: membuka mikrofon, Whisper di Worker, memahami kalimat, dan alur satu orang dari bicara sampai terapkan. Termasuk Mode Menyimak, yang membiarkan mikrofon terbuka dan menyerahkan batas kalimat ke Silero VAD.

**Taruh di sini:** Logika suara baru, misalnya cara baru membaca jawaban atau aturan baru soal kapan sebuah ucapan dianggap perintah.

**Bukan di sini:** Tampilan (`components/voice/`), orchestrator dan prompt model (`core/agent/`).

| File | Isi |
| --- | --- |
| flow.ts | Alur suara per perangkat; permintaan terbaru menang (D74) |
| flow.test.ts | Uji alur dengan mikrofon, model, dan jam palsu |
| speech.ts | Mikrofon lewat AudioWorklet, mode ASR, bahasa ucapan (D65) |
| asr.worker.ts | Whisper di Web Worker, WebGPU atau WASM |
| vad.worker.ts | Silero VAD di Worker sendiri; menjawab "ada yang bicara" saja |
| trigger.ts | Ucapan mana yang ditujukan ke Karsa, di Mode Menyimak |
| trigger.test.ts | Uji kata pemicu, dua arah: yang harus dan yang tidak boleh dikerjakan |
| pipeline.ts | Kalimat menjadi draf lewat penyedia yang dipilih |
| answers.ts | Membaca "ya", "batal", dan "yang kedua" |
| types.ts | Draf, operasi, dan pertanyaan |
