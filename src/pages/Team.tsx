import { Plus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  ConfirmModal,
  MemberCard,
  Modal,
  ModernSelect,
  PageHeader,
  StatusBadge,
} from "../components/ui";
import { useRoom, useToast } from "../contexts/AppContexts";
import type { TeamMember } from "../types";
import { endpoints } from "../lib/api";
export function Team() {
  const { state, setMembers } = useRoom();
  const { show } = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("All");
  const [channel, setChannel] = useState("All");
  const [edit, setEdit] = useState<TeamMember | null>(null);
  const [remove, setRemove] = useState<TeamMember | null>(null);
  const list = state.members.filter(
    (m) =>
      (role === "All" || m.role === role) &&
      (channel === "All" || m.channel === channel) &&
      m.name.toLowerCase().includes(q.toLowerCase()),
  );
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!edit || !state.activeRoomId) return; const data = new FormData(e.currentTarget); const member = { ...edit, name: String(data.get("name")), role: String(data.get("role")), channel: String(data.get("channel")), roomId: state.activeRoomId };
    try { const saved = edit.id ? await endpoints.updateMember(member) : await endpoints.createMember(member); setMembers(x => edit.id ? x.map(m => m.id === saved.id ? saved : m) : [...x, saved]); setEdit(null); show("Member saved"); } catch (error) { show(error instanceof Error ? error.message : "Gagal menyimpan member", "error"); }
  };
  return (
    <>
      <PageHeader
        title="Team Members"
        description="Manage roles, channels, and connection readiness."
        action={
          <button
            className="btn-primary"
            onClick={() =>
              setEdit({
                id: "",
                name: "",
                role: "Singer",
                channel: "Vocal",
                status: "disconnected",
                headset: false,
                battery: 100,
                lastActive: "Never",
              })
            }
          >
            <Plus size={18} /> Add member
          </button>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <label className="relative">
          <Search className="absolute left-3 top-3.5 muted" size={17} />
          <input
            className="field !pl-10"
            placeholder="Search members"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <ModernSelect options={["All", ...new Set(state.members.map(m => m.role))].map(value => ({ value }))} value={role} onValueChange={setRole} />
        <ModernSelect options={["All", ...new Set(state.members.map(m => m.channel))].map(value => ({ value }))} value={channel} onValueChange={setChannel} />
      </div>
      <div className="grid gap-3 md:hidden">
        {list.map((m) => (
          <div key={m.id} onClick={() => setEdit(m)}>
            <MemberCard member={m} />
          </div>
        ))}
      </div>
      <div className="surface hidden overflow-hidden md:block">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-xs uppercase muted dark:bg-slate-900">
            <tr>
              {[
                "Member",
                "Role",
                "Channel",
                "Headset",
                "Status",
                "Last active",
                "",
              ].map((x) => (
                <th className="p-4" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.map((m) => (
              <tr
                key={m.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
              >
                <td className="p-4 font-semibold">{m.name}</td>
                <td className="p-4 text-sm">{m.role}</td>
                <td className="p-4 text-sm">{m.channel}</td>
                <td className="p-4 text-sm">
                  {m.headset ? "Connected" : "None"}
                </td>
                <td className="p-4">
                  <StatusBadge status={m.status} />
                </td>
                <td className="p-4 text-sm muted">{m.lastActive}</td>
                <td className="p-4">
                  <button
                    className="text-sm text-brand-500"
                    onClick={() => setEdit(m)}
                  >
                    Edit
                  </button>{" "}
                  <button
                    className="ml-3 text-sm text-red-500"
                    onClick={() => setRemove(m)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        open={!!edit}
        title={edit?.id ? "Edit member" : "Add team member"}
        onClose={() => setEdit(null)}
      >
        {edit && (
          <form onSubmit={save} className="space-y-4">
            <label>
              <span className="label">Name</span>
              <input name="name" className="field" required defaultValue={edit.name} />
            </label>
            <label>
              <span className="label">Role</span>
              <ModernSelect name="role" defaultValue={edit.role} options={["Singer", "Keyboardist", "Sound Engineer", "Multimedia"].map(value => ({ value }))} />
            </label>
            <label>
              <span className="label">Assigned channel</span>
              <ModernSelect name="channel" defaultValue={edit.channel} options={["Vocal", "Band", "Sound", "Production"].map(value => ({ value }))} />
            </label>
            <button className="btn-primary w-full">Save member</button>
          </form>
        )}
      </Modal>
      <ConfirmModal
        open={!!remove}
        title="Remove team member?"
        description={`${remove?.name} will no longer have access to this team.`}
        onClose={() => setRemove(null)}
        onConfirm={async () => {
          if (!remove) return; try { await endpoints.deleteMember(remove.id); setMembers(x => x.filter(m => m.id !== remove.id)); setRemove(null); show("Member removed", "warning"); } catch (error) { show(error instanceof Error ? error.message : "Gagal menghapus member", "error"); }
        }}
      />
    </>
  );
}
