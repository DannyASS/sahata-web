import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export type Language = "en" | "id";
const id: Record<string, string> = {
  "Dashboard": "Dasbor", "Worship Rooms": "Ruang Ibadah", "Team Members": "Anggota Tim", "Cue Presets": "Preset Cue", "Songs": "Lagu", "Settings": "Pengaturan", "Master Users": "Master Pengguna", "Role Management": "Manajemen Role",
  "Login": "Masuk", "Register": "Daftar", "Join Room": "Gabung Room", "Logout": "Keluar", "Back to landing page": "Kembali ke halaman utama",
  "Welcome back": "Selamat datang kembali", "Connect with your worship team.": "Terhubung dengan tim pelayanan Anda.", "Email": "Email", "Password": "Kata sandi", "Remember me": "Ingat saya", "Forgot password?": "Lupa kata sandi?", "Logging in...": "Sedang masuk...", "Belum punya akun?": "Belum punya akun?",
  "Register account": "Daftar akun", "Akun baru harus disetujui Admin Gereja.": "Akun baru harus disetujui Admin Gereja.", "Full name": "Nama lengkap", "Confirm password": "Konfirmasi kata sandi", "Registering...": "Sedang mendaftar...", "Registrasi diterima": "Registrasi diterima", "Tunggu Admin Gereja menyetujui akun Anda sebelum login.": "Tunggu Admin Gereja menyetujui akun Anda sebelum login.", "Go to login": "Ke halaman masuk",
  "Join worship room": "Gabung ruang ibadah", "Enter your details and check your audio setup.": "Masukkan data dan periksa perangkat audio Anda.", "Room code": "Kode room", "Display name": "Nama tampilan", "Role": "Role", "Channel": "Channel", "Audio device": "Perangkat audio", "Device check": "Pemeriksaan perangkat", "Joining...": "Sedang bergabung...",
  "Made for ministry teams": "Dibuat untuk tim pelayanan", "Communication that keeps every": "Komunikasi yang menjaga setiap", "servant connected": "pelayan tetap terhubung", "Create Worship Room": "Buat Ruang Ibadah", "Join Existing Room": "Gabung Room", "Stay connected. Serve in harmony.": "Tetap terhubung. Melayani dalam kesatuan.",
  "Everything in sync": "Semua tersinkronisasi", "Built for calm, focused serving": "Dibuat untuk pelayanan yang tenang dan fokus", "Simple workflow": "Alur sederhana", "Ready before the first note": "Siap sebelum nada pertama", "Create room": "Buat room", "Invite ministry team": "Undang tim pelayanan", "Connect headset": "Hubungkan headset", "Start serving together": "Mulai melayani bersama", "Join your team": "Gabung dengan tim",
  "Realtime voice": "Suara realtime", "Push-to-talk": "Tekan untuk bicara", "Visual cue": "Cue visual", "Role channels": "Channel berdasarkan role", "Connection monitor": "Monitor koneksi", "Mobile friendly": "Ramah perangkat mobile",
  "Save settings": "Simpan pengaturan", "Profile": "Profil", "Name": "Nama", "Notifications": "Notifikasi", "Vibration": "Getaran", "Sound cue": "Suara cue", "High-priority alert": "Peringatan prioritas tinggi", "Appearance": "Tampilan", "Dark mode": "Mode gelap", "High contrast mode": "Kontras tinggi", "Reduce animation": "Kurangi animasi", "Font size": "Ukuran font", "Language": "Bahasa",
  "View all": "Lihat semua", "Upcoming services": "Pelayanan mendatang", "Team connection status": "Status koneksi tim", "Recent activity": "Aktivitas terbaru", "Connected Members": "Member Terhubung", "Online Speakers": "Speaker Online", "Total Rooms": "Total Room",
  "So in Christ we, though many, form one body, and each member belongs to all the others.": "Demikian juga kita, walaupun banyak, adalah satu tubuh di dalam Kristus; dan kita masing-masing adalah anggota yang seorang terhadap yang lain.",
  "Romans 12:5": "Roma 12:5",
  "Connection is more than communication—it is serving together as one body, with every role supporting the others.": "Terhubung bukan hanya soal komunikasi, tetapi tentang melayani bersama sebagai satu tubuh dengan setiap peran saling mendukung.",
};
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void; t: (text: string) => string }>({ language: "en", setLanguage: () => {}, t: text => text });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, update] = useState<Language>(() => (localStorage.getItem("church-language") as Language) || "en");
  const setLanguage = (next: Language) => { update(next); localStorage.setItem("church-language", next); document.documentElement.lang = next; };
  const value = useMemo(() => ({ language, setLanguage, t: (text: string) => language === "id" ? id[text] || text : text }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage(); const [open, setOpen] = useState(false); const root = useRef<HTMLDivElement>(null);
  useEffect(() => { const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); }; window.addEventListener("pointerdown", close); return () => window.removeEventListener("pointerdown", close); }, []);
  return <div ref={root} className={`relative ${compact ? "w-20" : "w-36"}`}>
    <button type="button" className="field flex items-center justify-between !pr-3 font-semibold" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(value => !value)}><span>{language.toUpperCase()}</span><ChevronDown size={16} className={`text-brand-500 transition ${open ? "rotate-180" : ""}`} /></button>
    {open && <div role="listbox" className="absolute right-0 top-[calc(100%+.5rem)] z-[80] w-full overflow-hidden rounded-xl border bg-white p-1.5 shadow-2xl dark:bg-slate-900">{(["en", "id"] as Language[]).map(option => <button key={option} type="button" role="option" aria-selected={language === option} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-sm font-medium transition ${language === option ? "bg-brand-500 text-slate-950" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`} onClick={() => { setLanguage(option); setOpen(false); }}><span>{option.toUpperCase()}</span>{language === option && <Check size={15} />}</button>)}</div>}
  </div>;
}
