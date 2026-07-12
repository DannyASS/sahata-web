import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ActivityLog, TeamMember, User, WorshipRoom } from "../types";
import { endpoints } from "../lib/api";
import { LanguageProvider } from "../i18n";

type Theme = "dark" | "light";
const ThemeCtx = createContext({ theme: "dark" as Theme, setTheme: (_: Theme) => {}, toggle: () => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("sahata-theme") as Theme) || "dark");
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); localStorage.setItem("sahata-theme", theme); }, [theme]);
  return <ThemeCtx.Provider value={{ theme, setTheme, toggle: () => setTheme(t => t === "dark" ? "light" : "dark") }}>{children}</ThemeCtx.Provider>;
}
export const useTheme = () => useContext(ThemeCtx);

const storedUser = () => { try { return JSON.parse(localStorage.getItem("sahata-user") || "null") as User | null; } catch { return null; } };
const AuthCtx = createContext<{ user: User | null; login: (email: string, password: string) => Promise<void>; logout: () => void }>({ user: null, login: async () => {}, logout: () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(storedUser);
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("sahata-user");
    localStorage.removeItem("sahata-token");
    localStorage.removeItem("sahata-room-role");
    sessionStorage.removeItem("sahata-joined-room");
    sessionStorage.removeItem("sahata-joined-member");
  }, []);
  useEffect(() => { window.addEventListener("sahata:unauthorized", logout); return () => window.removeEventListener("sahata:unauthorized", logout); }, [logout]);
  const login = async (email: string, password: string) => { const result = await endpoints.login(email, password); setUser(result.user); localStorage.setItem("sahata-user", JSON.stringify(result.user)); localStorage.setItem("sahata-token", result.token); };
  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);

type Toast = { id: number; message: string; type?: "success" | "warning" | "error" };
const ToastCtx = createContext<{ show: (message: string, type?: Toast["type"]) => void }>({ show: () => {} });
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const show = (message: string, type: Toast["type"] = "success") => { const id = Date.now(); setItems(x => [...x, { id, message, type }]); window.setTimeout(() => setItems(x => x.filter(t => t.id !== id)), 3200); };
  return <ToastCtx.Provider value={{ show }}>{children}<div className="fixed right-4 top-4 z-[100] space-y-2" aria-live="polite">{items.map(t => <div key={t.id} className={`surface flex min-w-72 items-center gap-3 p-4 shadow-xl ${t.type === "error" ? "border-red-500" : t.type === "warning" ? "border-amber-500" : "border-emerald-500"}`}><span className={`h-2.5 w-2.5 rounded-full ${t.type === "error" ? "bg-red-500" : t.type === "warning" ? "bg-amber-500" : "bg-emerald-500"}`} /><span className="text-sm font-medium">{t.message}</span></div>)}</div></ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

type RoomState = { rooms: WorshipRoom[]; members: TeamMember[]; activity: ActivityLog[]; activeRoomId: string; loading: boolean };
type RoomAction = { type: "ADD_ACTIVITY"; activity: ActivityLog } | { type: "SET_MEMBERS"; members: TeamMember[] };
const RoomCtx = createContext<{ state: RoomState; dispatch: React.Dispatch<RoomAction>; refreshRooms: () => Promise<void>; selectRoom: (id: string) => Promise<void>; setRooms: React.Dispatch<React.SetStateAction<WorshipRoom[]>>; setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>; setActivity: React.Dispatch<React.SetStateAction<ActivityLog[]>> }>({ state: { rooms: [], members: [], activity: [], activeRoomId: "", loading: false }, dispatch: () => {}, refreshRooms: async () => {}, selectRoom: async () => {}, setRooms: () => {}, setMembers: () => {}, setActivity: () => {} });
export function RoomProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const readJoinedRoom = () => { try { const value = JSON.parse(sessionStorage.getItem("sahata-joined-room") || "null") as WorshipRoom | null; return value ? [value] : []; } catch { return []; } };
  const readJoinedMember = () => { try { const value = JSON.parse(sessionStorage.getItem("sahata-joined-member") || "null") as TeamMember | null; return value ? [value] : []; } catch { return []; } };
  const [rooms, setRooms] = useState<WorshipRoom[]>(readJoinedRoom); const [members, setMembers] = useState<TeamMember[]>(readJoinedMember); const [activity, setActivity] = useState<ActivityLog[]>([]); const [activeRoomId, setActiveRoomId] = useState(() => readJoinedRoom()[0]?.id || ""); const [loading, setLoading] = useState(false);
  const refreshRooms = useCallback(async () => { if (!user) return; setLoading(true); try { const data = await endpoints.rooms(); setRooms(data || []); setActiveRoomId(id => id || data?.[0]?.id || ""); } finally { setLoading(false); } }, [user]);
  const selectRoom = useCallback(async (id: string) => { if (!id) return; setActiveRoomId(id); const [m, a] = await Promise.all([endpoints.members(id), endpoints.activities(id)]); setMembers(m || []); setActivity(a || []); }, []);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { refreshRooms().catch(() => setRooms([])); }, [refreshRooms]);
  useEffect(() => { const id = activeRoomId || rooms[0]?.id; if (user && id) selectRoom(id).catch(() => { setMembers([]); setActivity([]); }); }, [user, activeRoomId, rooms, selectRoom]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const state = useMemo(() => ({ rooms, members, activity, activeRoomId, loading }), [rooms, members, activity, activeRoomId, loading]);
  const dispatch: React.Dispatch<RoomAction> = action => { if (action.type === "SET_MEMBERS") setMembers(action.members); else { const payload = action.activity; endpoints.createActivity({ roomId: activeRoomId, sender: payload.sender, senderRole: payload.senderRole, message: payload.message, target: payload.target, received: payload.received }).then(created => setActivity(x => [created, ...x])).catch(() => {}); } };
  return <RoomCtx.Provider value={{ state, dispatch, refreshRooms, selectRoom, setRooms, setMembers, setActivity }}>{children}</RoomCtx.Provider>;
}
export const useRoom = () => useContext(RoomCtx);
export function Providers({ children }: { children: ReactNode }) { return <ThemeProvider><LanguageProvider><AuthProvider><ToastProvider><RoomProvider>{children}</RoomProvider></ToastProvider></AuthProvider></LanguageProvider></ThemeProvider>; }
