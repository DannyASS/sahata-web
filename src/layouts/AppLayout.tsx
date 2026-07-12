import {
  Bell,
  ChevronLeft,
  LayoutDashboard,
  Radio,
  Users,
  SlidersHorizontal,
  Settings,
  LogOut,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Brand, ConnectionIndicator, ThemeToggle } from "../components/ui";
import { useAuth, useToast } from "../contexts/AppContexts";
import { LanguageSelect, useLanguage } from "../i18n";
const baseNav = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Worship Rooms", "/rooms", Radio],
  ["Team Members", "/team", Users],
  ["Cue Presets", "/cues", SlidersHorizontal],
  ["Settings", "/settings", Settings],
] as const;
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const memberNav = baseNav.filter(([, path]) => ["/dashboard", "/rooms", "/settings"].includes(path));
  const nav = user?.role === "Admin Gereja" ? [...baseNav, ["Master Users", "/master-users", UserCog] as const, ["Role Management", "/role-management", ShieldCheck] as const] : user?.role === "Member" ? memberNav : baseNav;
  const { show } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    show("Anda berhasil logout");
    navigate("/login", { replace: true });
  };
  return (
    <div className="min-h-screen">
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r bg-white p-4 transition-all dark:bg-panel md:flex md:flex-col ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex items-center justify-between">
          <Brand compact={collapsed} />
          <button
            className="btn-secondary !h-9 !w-9 !p-0"
            onClick={() => setCollapsed((x) => !x)}
          >
            <ChevronLeft className={collapsed ? "rotate-180" : ""} size={16} />
          </button>
        </div>
        <nav className="mt-8 space-y-1">
          {nav.map(([label, to, Icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-xl px-3 transition ${isActive ? "bg-brand-500/15 text-brand-500" : "muted hover:bg-slate-100 dark:hover:bg-slate-800"}`
              }
            >
              <Icon size={20} />
              {!collapsed && (
                <span className="text-sm font-medium">{t(label)}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          {!collapsed && (
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
              <p className="text-sm font-semibold">
                {user?.name || "Demo User"}
              </p>
              <p className="text-xs muted">{user?.role || "Music Director"}</p>
            </div>
          )}
          <button
            type="button"
            className={`btn-secondary mt-3 w-full text-red-500 ${collapsed ? "!px-0" : "justify-start"}`}
            onClick={handleLogout}
            aria-label="Logout"
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
      <div className={`transition-all ${collapsed ? "md:pl-20" : "md:pl-64"}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/90 px-4 backdrop-blur dark:bg-ink/90 sm:px-6">
          <div className="md:hidden">
            <Brand compact />
          </div>
          <div className="hidden md:block">
            <ConnectionIndicator label="System connected" />
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary !h-11 !w-11 !p-0"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>
            <ThemeToggle />
            <LanguageSelect compact />
            <button
              type="button"
              className="btn-secondary !h-11 !w-11 !p-0 text-red-500 md:hidden"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 md:pb-8">
          <Outlet />
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-white px-1 pb-[max(.3rem,env(safe-area-inset-bottom))] dark:bg-panel md:hidden">
        {nav.slice(0, 5).map(([label, to, Icon]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] ${isActive ? "text-brand-500" : "muted"}`
            }
          >
            <Icon size={20} />
            <span>{t(label).split(" ")[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
