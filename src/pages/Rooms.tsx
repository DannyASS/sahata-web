import { Plus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmModal, Modal, ModernSelect, PageHeader, RoomCard } from "../components/ui";
import { useAuth, useRoom, useToast } from "../contexts/AppContexts";
import type { WorshipRoom } from "../types";
import { endpoints } from "../lib/api";
const blank: WorshipRoom = {
  id: "",
  name: "",
  date: new Date().toISOString().slice(0, 10),
  startTime: "08:00",
  endTime: "10:00",
  code: "",
  members: 0,
  channels: ["All Team"],
  status: "Scheduled",
};
export function Rooms() {
  const { state, setRooms } = useRoom();
  const { user } = useAuth();
  const canManage = user?.role !== "Member";
  const { show } = useToast();
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState<WorshipRoom | null>(null);
  const [deleting, setDeleting] = useState<WorshipRoom | null>(null);
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const data = new FormData(e.currentTarget);
    const room: WorshipRoom = {
      ...editing,
      id: editing.id,
      name: String(data.get("name")),
      date: String(data.get("date")),
      startTime: String(data.get("start")),
      endTime: String(data.get("end")),
      code: String(data.get("code")),
      status: String(data.get("status")) as WorshipRoom["status"],
      channels: data.getAll("channels").map(String),
    };
    try {
      const saved = editing.id ? await endpoints.updateRoom(room) : await endpoints.createRoom({ name: room.name, date: room.date, startTime: room.startTime, endTime: room.endTime, code: room.code, status: room.status, channels: room.channels });
      setRooms(x => editing.id ? x.map(r => r.id === saved.id ? saved : r) : [saved, ...x]); setEditing(null); show(editing.id ? "Room updated" : "Room created");
    } catch (error) { show(error instanceof Error ? error.message : "Gagal menyimpan room", "error"); }
  };
  const list = state.rooms.filter(
    (r) =>
      (filter === "All" || r.status === filter) &&
      r.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Worship Rooms"
        description="Plan, invite, and enter your ministry communication rooms."
        action={canManage ?
          <button
            className="btn-primary"
            onClick={() => setEditing({ ...blank })}
          >
            <Plus size={18} /> Create room
          </button>
        : undefined}
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-3.5 muted" size={17} />
          <input
            className="field !pl-10"
            placeholder="Search rooms..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <ModernSelect className="sm:w-44" options={["All", "Live", "Scheduled", "Completed"].map(value => ({ value }))} value={filter} onValueChange={setFilter} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((r) => (
          <RoomCard
            key={r.id}
            room={r}
            onJoin={() => nav(`/room/${r.id}`)}
            onEdit={canManage ? () => setEditing({ ...r }) : undefined}
            onDelete={canManage ? () => setDeleting(r) : undefined}
          />
        ))}
      </div>
      <Modal
        open={!!editing}
        title={editing?.id ? "Edit worship room" : "Create worship room"}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <form onSubmit={save} className="space-y-4">
            <label>
              <span className="label">Room name</span>
              <input
                name="name"
                className="field"
                required
                defaultValue={editing.name}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="label">Date</span>
                <input
                  name="date"
                  type="date"
                  className="field"
                  required
                  defaultValue={editing.date}
                />
              </label>
              <label>
                <span className="label">Room code</span>
                <input name="code" className="field" required defaultValue={editing.code} placeholder="SHT-2407" />
              </label>
              <label>
                <span className="label">Start</span>
                <input
                  name="start"
                  type="time"
                  className="field"
                  defaultValue={editing.startTime}
                />
              </label>
              <label>
                <span className="label">End</span>
                <input
                  name="end"
                  type="time"
                  className="field"
                  defaultValue={editing.endTime}
                />
              </label>
            </div>
            <label><span className="label">Status</span><ModernSelect name="status" options={["Scheduled", "Live", "Completed"].map(value => ({ value }))} defaultValue={editing.status} /></label>
            <fieldset><legend className="label">Channels</legend><div className="flex flex-wrap gap-3">{["All Team", "Band", "Vocal", "Production", "Multimedia", "Sound"].map(c => <label key={c} className="flex gap-2 text-sm"><input type="checkbox" name="channels" value={c} defaultChecked={editing.channels.includes(c)} />{c}</label>)}</div></fieldset>
            <button className="btn-primary w-full">Save room</button>
          </form>
        )}
      </Modal>
      <ConfirmModal
        open={!!deleting}
        title="Delete worship room?"
        description={`This will remove ${deleting?.name || "the room"} from your schedule.`}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try { await endpoints.deleteRoom(deleting.id); setRooms(x => x.filter(r => r.id !== deleting.id)); setDeleting(null); show("Room deleted", "warning"); }
          catch (error) { show(error instanceof Error ? error.message : "Gagal menghapus room", "error"); }
        }}
      />
    </>
  );
}
