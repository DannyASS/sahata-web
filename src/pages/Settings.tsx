import { Bell, Languages, Save, SlidersHorizontal, User } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ModernSelect, PageHeader } from "../components/ui";
import { useAuth, useTheme, useToast } from "../contexts/AppContexts";
import { endpoints } from "../lib/api";
import { useLanguage, type Language } from "../i18n";

type SettingsData = { name: string; email: string; role: string; visual: boolean; vibration: boolean; sound: boolean; priority: boolean; fontSize: string; contrast: boolean; reduce: boolean; language: string; cueVolume: number; audioDevice: string; micSensitivity: number };
const defaults: SettingsData = { name: "", email: "", role: "", visual: true, vibration: true, sound: true, priority: true, fontSize: "Medium", contrast: false, reduce: false, language: "id", cueVolume: 72, audioDevice: "Default headset", micSensitivity: 70 };

export function Settings() {
  const { theme, toggle } = useTheme(); const { user } = useAuth(); const { show } = useToast(); const { language, setLanguage, t } = useLanguage(); const [settings, setSettings] = useState(defaults);
  // Context callbacks are intentionally excluded to load once per authenticated user.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { endpoints.settings().then(data => { setSettings(current => ({ ...current, name: user?.name || "", email: user?.email || "", role: user?.role || "", visual: data.notifications, vibration: data.vibration, language, cueVolume: data.cueVolume, audioDevice: data.audioDevice, micSensitivity: data.micSensitivity })); }).catch(error => show(error instanceof Error ? error.message : "Gagal memuat settings", "error")); }, [user]);
  useEffect(() => { document.documentElement.style.fontSize = settings.fontSize === "Large" ? "18px" : settings.fontSize === "Small" ? "14px" : "16px"; document.documentElement.classList.toggle("contrast-more", settings.contrast); }, [settings.fontSize, settings.contrast]);
  const set = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => setSettings(current => ({ ...current, [key]: value }));
  const save = async () => { try { await endpoints.saveSettings({ userId: user?.id || "", theme, language, notifications: settings.visual, vibration: settings.vibration, audioDevice: settings.audioDevice, micSensitivity: settings.micSensitivity, cueVolume: settings.cueVolume }); show("Settings saved"); } catch (error) { show(error instanceof Error ? error.message : "Gagal menyimpan settings", "error"); } };
  return <><PageHeader title={t("Settings")} description="Personalize Church for your serving environment." action={<button className="btn-primary" onClick={save}><Save size={18} /> {t("Save settings")}</button>} />
    <div className="space-y-5">
      <Section icon={<User />} title={t("Profile")}><div className="grid gap-4 sm:grid-cols-3"><Field label={t("Name")}><input className="field" value={settings.name} disabled /></Field><Field label={t("Email")}><input className="field" value={settings.email} disabled /></Field><Field label={t("Role")}><input className="field" value={settings.role} disabled /></Field></div></Section>
      <Section icon={<Bell />} title={t("Notifications")}><div className="grid gap-3 sm:grid-cols-2"><Toggle label={t("Visual cue")} checked={settings.visual} onChange={value => set("visual", value)} /><Toggle label={t("Vibration")} checked={settings.vibration} onChange={value => set("vibration", value)} /><Toggle label={t("Sound cue")} checked={settings.sound} onChange={value => set("sound", value)} /><Toggle label={t("High-priority alert")} checked={settings.priority} onChange={value => set("priority", value)} /></div></Section>
      <Section icon={<SlidersHorizontal />} title={t("Appearance")}><div className="grid gap-3 sm:grid-cols-2"><Toggle label={t("Dark mode")} checked={theme === "dark"} onChange={toggle} /><Toggle label={t("High contrast mode")} checked={settings.contrast} onChange={value => set("contrast", value)} /><Toggle label={t("Reduce animation")} checked={settings.reduce} onChange={value => set("reduce", value)} /><Field label={t("Font size")}><ModernSelect options={["Small", "Medium", "Large"].map(value => ({ value }))} value={settings.fontSize} onValueChange={value => set("fontSize", value)} /></Field></div></Section>
      <Section icon={<Languages />} title={t("Language")}><ModernSelect className="max-w-sm" options={[{ value: "en", label: "English" }, { value: "id", label: "Bahasa Indonesia" }]} value={language} onValueChange={value => { const next = value as Language; setLanguage(next); set("language", next); }} /></Section>
    </div></>;
}
function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) { return <section className="surface p-5 sm:p-6"><div className="mb-5 flex items-center gap-3 text-brand-500">{icon}<h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2></div>{children}</section>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="label">{label}</span>{children}</label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl border p-3"><span className="text-sm font-medium">{label}</span><input type="checkbox" className="h-5 w-5 accent-cyan-500" checked={checked} onChange={event => onChange(event.target.checked)} /></label>; }
