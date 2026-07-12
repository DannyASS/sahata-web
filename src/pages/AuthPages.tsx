import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Headphones, Mic2, Speaker, CheckCircle2 } from "lucide-react";
import { Brand, ModernSelect, ThemeToggle } from "../components/ui";
import { useAuth, useRoom, useToast } from "../contexts/AppContexts";
import { endpoints } from "../lib/api";
import { LanguageSelect, useLanguage } from "../i18n";
export function Login() {
  const { t } = useLanguage();
  const nav = useNavigate();
  const { login } = useAuth();
  const { show } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try { await login(email, password); show("Welcome to Church"); nav("/dashboard"); }
    catch (error) { show(error instanceof Error ? error.message : "Login gagal", "error"); }
    finally { setSubmitting(false); }
  };
  return (
    <AuthShell title="Welcome back" subtitle="Connect with your worship team.">
      <button
        type="button"
        className="btn-secondary mb-5"
        onClick={() => nav("/")}
      >
        <ArrowLeft size={17} /> {t("Back to landing page")}
      </button>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="label">{t("Email")}</span>
          <input
            className="field"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">{t("Password")}</span>
          <input
            className="field"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked /> {t("Remember me")}
          </label>
          <button type="button" className="text-brand-500 hover:underline">
            {t("Forgot password?")}
          </button>
        </div>
        <button className="btn-primary w-full" type="submit" disabled={submitting}>
          {submitting ? t("Logging in...") : t("Login")}
        </button>
        <p className="text-center text-sm muted">Belum punya akun? <button type="button" className="font-semibold text-brand-500" onClick={() => nav("/register")}>Register</button></p>
      </form>
    </AuthShell>
  );
}
export function Register() {
  const nav = useNavigate(); const { show } = useToast(); const { t } = useLanguage(); const [submitting, setSubmitting] = useState(false); const [success, setSuccess] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const data = new FormData(e.currentTarget); const password = String(data.get("password"));
    if (password !== String(data.get("confirmPassword"))) { show("Konfirmasi password tidak sama", "error"); return; }
    setSubmitting(true);
    try { const result = await endpoints.register({ name: String(data.get("name")).trim(), email: String(data.get("email")).trim(), password }); setSuccess(true); show(result.message); }
    catch (error) { show(error instanceof Error ? error.message : "Registrasi gagal", "error"); }
    finally { setSubmitting(false); }
  };
  return <AuthShell title="Register account" subtitle="Akun baru harus disetujui Admin Gereja.">
    <button type="button" className="btn-secondary mb-5" onClick={() => nav("/")}><ArrowLeft size={17} /> {t("Back to landing page")}</button>
    {success ? <div className="surface !rounded-xl p-5 text-center"><CheckCircle2 className="mx-auto text-emerald-500" /><h3 className="mt-3 font-bold">Registrasi diterima</h3><p className="mt-2 text-sm muted">Tunggu Admin Gereja menyetujui akun Anda sebelum login.</p><button className="btn-primary mt-5 w-full" onClick={() => nav("/login")}>Go to login</button></div> :
    <form onSubmit={submit} className="space-y-4">
      <label className="block"><span className="label">Full name</span><input name="name" className="field" required /></label>
      <label className="block"><span className="label">Email</span><input name="email" className="field" type="email" required /></label>
      <label className="block"><span className="label">Password</span><input name="password" className="field" type="password" minLength={8} required /></label>
      <label className="block"><span className="label">Confirm password</span><input name="confirmPassword" className="field" type="password" minLength={8} required /></label>
      <button className="btn-primary w-full" disabled={submitting}>{submitting ? "Registering..." : "Register"}</button>
    </form>}
  </AuthShell>;
}
export function JoinRoom() {
  const nav = useNavigate();
  const { show } = useToast();
  const { setRooms, setMembers } = useRoom();
  const [testing, setTesting] = useState("");
  const [joining, setJoining] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setJoining(true);
    try {
      const result = await endpoints.join({ code: String(data.get("code")).trim().toUpperCase(), name: String(data.get("name")).trim(), role: String(data.get("role")), channel: String(data.get("channel")), headset: data.get("headset") === "on" });
      setRooms([result.room]); setMembers([result.member]);
      localStorage.setItem("sahata-room-role", "member");
      sessionStorage.setItem("sahata-joined-room", JSON.stringify(result.room));
      sessionStorage.setItem("sahata-joined-member", JSON.stringify(result.member));
      show(`Connected to ${result.room.name}`); nav(`/room/${result.room.id}`);
    } catch (error) { show(error instanceof Error ? error.message : "Gagal bergabung ke room", "error"); }
    finally { setJoining(false); }
  };
  const test = (name: string) => {
    setTesting(name);
    setTimeout(() => {
      setTesting("");
      show(`${name} test passed`);
    }, 900);
  };
  return (
    <AuthShell
      title="Join worship room"
      subtitle="Enter your details and check your audio setup."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Room code</span>
            <input
              className="field uppercase"
              name="code"
              required
              placeholder="Masukkan kode room"
            />
          </label>
          <label>
            <span className="label">Display name</span>
            <input name="name" className="field" required placeholder="Your name" />
          </label>
        </div>
        <label>
          <span className="label">Role</span>
          <ModernSelect name="role" options={[
              "Worship Leader",
              "Singer",
              "Keyboardist",
              "Guitarist",
              "Bassist",
              "Drummer",
              "Sound Engineer",
              "Multimedia",
              "Lighting",
              "Stage Manager",
            ].map(value => ({ value }))} />
        </label>
        <label><span className="label">Channel</span><ModernSelect name="channel" options={["All Team", "Band", "Vocal", "Production", "Multimedia", "Sound"].map(value => ({ value }))} /></label>
        <label>
          <span className="label">Audio device</span>
          <ModernSelect options={["Default headset", "USB Audio Device"].map(value => ({ value }))} />
        </label>
        <div className="surface !rounded-xl p-4">
          <p className="mb-3 font-semibold">Device check</p>
          {(
            [
              [Mic2, "Microphone detected"],
              [Headphones, "Headset detected"],
              [Speaker, "Speaker output ready"],
            ] as const
          ).map(([Icon, label]) => (
            <div
              className="flex items-center gap-3 py-2 text-sm"
              key={String(label)}
            >
              <Icon size={17} className="text-brand-500" />
              <span className="flex-1">{label}</span>
              <CheckCircle2 size={17} className="text-emerald-500" />
            </div>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={!!testing}
              onClick={() => test("Microphone")}
            >
              Test microphone
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={!!testing}
              onClick={() => test("Headset")}
            >
              Test headset
            </button>
          </div>
        </div>
        <label className="flex gap-2 text-sm">
          <input name="headset" type="checkbox" required /> I am using a headset
        </label>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" defaultChecked /> Allow vibration cue
        </label>
        <button className="btn-primary w-full" disabled={joining}>{joining ? "Joining..." : "Join Room"}</button>
      </form>
    </AuthShell>
  );
}
function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Brand />
        <div className="flex gap-2"><LanguageSelect compact /><ThemeToggle /></div>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
        <div className="hidden lg:block">
          <span className="chip bg-brand-500/10 text-brand-500">
            Stay connected
          </span>
          <h1 className="mt-5 text-5xl font-black leading-tight">
            Serve with clarity.
            <br />
            <span className="text-brand-500">Move as one.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg muted">
            Communication designed for the pace and focus of live worship
            ministry.
          </p>
        </div>
        <section className="surface mx-auto w-full max-w-lg p-6 sm:p-8">
          <h2 className="text-2xl font-bold">{t(title)}</h2>
          <p className="mb-7 mt-1 muted">{t(subtitle)}</p>
          {children}
        </section>
      </main>
    </div>
  );
}
