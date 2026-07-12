import { useEffect, useState } from "react";
import { Check, ShieldCheck, UserCog, X } from "lucide-react";
import { EmptyState, ModernSelect, PageHeader, StatusBadge } from "../components/ui";
import { useToast } from "../contexts/AppContexts";
import { endpoints } from "../lib/api";
import type { User } from "../types";

export const userRoles = ["Admin Gereja", "Music Director", "Member"];

function useUsers() {
  const { show } = useToast(); const [users, setUsers] = useState<User[]>([]); const [loading, setLoading] = useState(true);
  // Load once when the admin page opens; toast identity is intentionally excluded.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { endpoints.users().then(data => setUsers(data || [])).catch(error => show(error instanceof Error ? error.message : "Gagal memuat user", "error")).finally(() => setLoading(false)); }, []);
  const update = async (user: User, role: string, status: User["status"]) => { try { const saved = await endpoints.updateUserAccess(user.id, role, status); setUsers(current => current.map(item => item.id === saved.id ? saved : item)); show("Akses user diperbarui"); } catch (error) { show(error instanceof Error ? error.message : "Gagal memperbarui user", "error"); } };
  return { users, loading, update };
}

export function MasterUsers() {
  const { users, loading, update } = useUsers();
  return <><PageHeader title="Master Users" description="Approve atau tolak akun yang baru mendaftar." />
    {!loading && !users.length ? <EmptyState title="Belum ada user" description="User yang register akan muncul di sini." /> : <div className="surface overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-slate-100 text-xs uppercase muted dark:bg-slate-900"><tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4">Registered</th><th className="p-4">Action</th></tr></thead><tbody className="divide-y">{users.map(user => <tr key={user.id}><td className="p-4"><b className="block">{user.name}</b><span className="text-xs muted">{user.email}</span></td><td className="p-4 text-sm">{user.role}</td><td className="p-4"><StatusBadge status={user.status} /></td><td className="p-4 text-sm muted">{new Date(user.createdAt || "").toLocaleDateString()}</td><td className="p-4"><div className="flex gap-2"><button className="btn-primary !min-h-9 text-xs" disabled={user.status === "active"} onClick={() => update(user, user.role, "active")}><Check size={15} /> Approve</button><button className="btn-secondary !min-h-9 text-xs text-red-500" disabled={user.status === "rejected"} onClick={() => update(user, user.role, "rejected")}><X size={15} /> Reject</button></div></td></tr>)}</tbody></table></div>}
  </>;
}

export function RoleManagement() {
  const { users, update } = useUsers();
  return <><PageHeader title="Role Management" description="Atur role dan hak akses setiap akun aktif." />
    <div className="mb-5 grid gap-3 sm:grid-cols-3">{[{ name: "Admin Gereja", icon: ShieldCheck, text: "Akses penuh termasuk approval dan role." }, { name: "Music Director", icon: UserCog, text: "Mengelola room, cue, dan komunikasi tim." }, { name: "Member", icon: UserCog, text: "Akses standar setelah disetujui admin." }].map(item => <div className="surface p-4" key={item.name}><item.icon className="mb-3 text-brand-500" /><b>{item.name}</b><p className="mt-1 text-xs muted">{item.text}</p></div>)}</div>
    <div className="surface divide-y">{users.map(user => <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center" key={user.id}><div className="min-w-0 flex-1"><b>{user.name}</b><p className="truncate text-xs muted">{user.email}</p></div><StatusBadge status={user.status} /><ModernSelect className="sm:w-56" options={userRoles.map(value => ({ value }))} value={user.role} onValueChange={role => update(user, role, user.status)} /></div>)}</div>
  </>;
}
