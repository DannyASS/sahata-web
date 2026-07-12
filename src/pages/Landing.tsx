import {
  ArrowRight,
  Radio,
  Smartphone,
  Users,
  Wifi,
  MessageSquare,
  ShieldCheck,
  AudioWaveform,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Brand, ThemeToggle } from "../components/ui";
import { LanguageSelect, useLanguage } from "../i18n";
const features = [
  [
    Radio,
    "Realtime voice",
    "Coordinate clearly with low-latency ready workflows.",
  ],
  [
    AudioWaveform,
    "Push-to-talk",
    "Speak to one channel without distracting others.",
  ],
  [MessageSquare, "Visual cue", "Send clear song and production directions."],
  [Users, "Role channels", "Keep band, vocal, and production focused."],
  [Wifi, "Connection monitor", "See team health at a glance."],
  [
    Smartphone,
    "Mobile friendly",
    "Built for the phone already in your pocket.",
  ],
] as const;
export function Landing() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen overflow-hidden">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSelect compact />
          <Link className="btn-secondary hidden sm:inline-flex" to="/login">
            {t("Login")}
          </Link>
          <Link className="btn-primary" to="/join">
            {t("Join Room")}
          </Link>
        </div>
      </nav>
      <main>
        <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div className="absolute -left-40 top-0 -z-10 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
          <div>
            <span className="chip bg-brand-500/10 text-brand-500">
              {t("Made for ministry teams")}
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl">
              {t("Communication that keeps every")}{" "}
              <span className="bg-gradient-to-r from-brand-400 to-violet bg-clip-text text-transparent">
                {t("servant connected")}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed muted">
              Realtime-ready communication for worship teams using smartphones
              and headsets. Stay coordinated from rehearsal to the final song.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/login" className="btn-primary">
                {t("Create Worship Room")} <ArrowRight size={18} />
              </Link>
              <Link to="/join" className="btn-secondary">
                {t("Join Existing Room")}
              </Link>
            </div>
            <p className="mt-5 text-sm muted">
              {t("Stay connected. Serve in harmony.")}
            </p>
          </div>
          <div className="surface relative p-4 shadow-glow sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-bold">Sunday Morning Service</p>
                <p className="text-xs text-emerald-500">
                  ● 18 members connected
                </p>
              </div>
              <span className="chip bg-emerald-500/15 text-emerald-500">
                LIVE
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-900 sm:col-span-2">
                <p className="text-xs muted">ACTIVE CUE</p>
                <div className="grid h-36 place-items-center">
                  <div className="text-center">
                    <AudioWaveform
                      className="mx-auto mb-2 text-brand-500"
                      size={38}
                    />
                    <b className="text-3xl">BRIDGE ×2</b>
                    <p className="text-xs muted">from Music Director</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {["Band", "Vocal", "Production"].map((x, i) => (
                  <div
                    className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900"
                    key={x}
                  >
                    <p className="text-xs muted">{x}</p>
                    <b>{[6, 4, 8][i]} online</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {["Intro", "Chorus", "Bridge", "Ending"].map((x) => (
                <div
                  key={x}
                  className="rounded-xl border p-3 text-center text-xs font-semibold"
                >
                  {x}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="border-y bg-slate-100/60 py-20 dark:bg-slate-950/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="font-semibold text-brand-500">{t("Everything in sync")}</p>
              <h2 className="mt-2 text-3xl font-bold">
                {t("Built for calm, focused serving")}
              </h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(([Icon, title, text]) => (
                <article key={String(title)} className="surface p-6">
                  <span className="inline-block rounded-xl bg-brand-500/10 p-3 text-brand-500">
                    <Icon />
                  </span>
                  <h3 className="mt-4 font-bold">{t(title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
          <span className="chip bg-brand-500/10 text-brand-500">Connected in service</span>
          <blockquote className="mx-auto mt-6 max-w-3xl text-2xl font-bold leading-relaxed sm:text-3xl">
            “{t("So in Christ we, though many, form one body, and each member belongs to all the others.")}”
          </blockquote>
          <p className="mt-5 font-semibold text-brand-500">{t("Romans 12:5")}</p>
          <p className="mx-auto mt-3 max-w-2xl muted">{t("Connection is more than communication—it is serving together as one body, with every role supporting the others.")}</p>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <p className="font-semibold text-brand-500">{t("Simple workflow")}</p>
            <h2 className="mt-2 text-3xl font-bold">
              {t("Ready before the first note")}
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              "Create room",
              "Invite ministry team",
              "Connect headset",
              "Start serving together",
            ].map((x, i) => (
              <div className="text-center" key={x}>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-500 font-bold text-slate-950">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{t(x)}</h3>
              </div>
            ))}
          </div>
          <div className="mt-20 surface p-8 text-center sm:p-12">
            <ShieldCheck className="mx-auto text-brand-500" size={40} />
            <h2 className="mt-4 text-2xl font-bold">
              Every role. One harmonious team.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl muted">
              Music Director, Worship Leader, singers, musicians, sound,
              multimedia, lighting, and stage management—connected in the
              channels they need.
            </p>
            <Link to="/join" className="btn-primary mt-7">
              {t("Join your team")}
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <p className="text-sm muted">
            © 2026 Church Worship Connect. Serve in harmony.
          </p>
        </div>
      </footer>
    </div>
  );
}
