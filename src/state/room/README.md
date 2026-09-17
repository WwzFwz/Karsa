# state/room

Satu ruang sebagai lima provider, disusun menurut ketergantungannya: Document, Presence, View, Session, Assistant. Masing-masing berubah karena alasannya sendiri, jadi komponen yang hanya membaca dokumen tidak ikut render saat orang bicara.

**Taruh di sini:** Keadaan ruang baru. Pertanyaannya: kalau berubah, apakah pembaca layar orang lain membacakan hal berbeda? Ya: Document. Hanya layar ini: View. Cara orang ini hadir di rapat: Session.

**Bukan di sini:** Keadaan di luar ruang (`state/`). Provider yang lebih awal tidak boleh membaca provider sesudahnya.

| File | Isi |
| --- | --- |
| RoomProvider.tsx | Menumpuk kelima provider |
| DocumentProvider.tsx | useDocument: dokumen, run, undo, templat, narasi |
| PresenceProvider.tsx | usePresence: peserta, menunjuk |
| ViewProvider.tsx | useView: fokus, lipat, penempatan tangan, panel |
| SessionProvider.tsx | useSession: mode rapat/telaah, bunyi, telusur audio |
| AssistantProvider.tsx | useAssistant: penyedia model, ASR, alur suara, draf (D74) |
