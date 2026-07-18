import { Plus, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmModal, Modal, ModernSelect, PageHeader, RoomCard } from "../components/ui";
import { useAuth, useRoom, useToast } from "../contexts/AppContexts";
import type { Song, WorshipRoom } from "../types";
import { endpoints } from "../lib/api";
const musicalKeys = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B", "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm"];
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
  songs: [],
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
  const [songCatalog, setSongCatalog] = useState<Song[]>([]);
  const [roomSongQuery, setRoomSongQuery] = useState("");
  const [songsLoading, setSongsLoading] = useState(false);
  const [deleting, setDeleting] = useState<WorshipRoom | null>(null);
  const roomModalOpen = Boolean(editing);
  useEffect(() => {
    if (!canManage || !roomModalOpen) return;
    const timer = window.setTimeout(() => {
      setSongsLoading(true);
      endpoints.songs(roomSongQuery.trim()).then(data => setSongCatalog(data || [])).catch(error => {
        setSongCatalog([]);
        show(error instanceof Error ? error.message : "Gagal memuat daftar lagu", "error");
      }).finally(() => setSongsLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [canManage, roomModalOpen, roomSongQuery, show]);
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
      songs: editing.songs || [],
    };
    try {
      const saved = editing.id ? await endpoints.updateRoom(room) : await endpoints.createRoom({ name: room.name, date: room.date, startTime: room.startTime, endTime: room.endTime, code: room.code, status: room.status, channels: room.channels, songs: room.songs });
      setRooms(x => editing.id ? x.map(r => r.id === saved.id ? saved : r) : [saved, ...x]); setEditing(null); setRoomSongQuery(""); show(editing.id ? "Room updated" : "Room created");
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
            onClick={() => setEditing({ ...blank, songs: [] })}
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
            onEdit={canManage ? () => setEditing({ ...r, songs: [...(r.songs || [])] }) : undefined}
            onDelete={canManage ? () => setDeleting(r) : undefined}
          />
        ))}
      </div>
      <Modal
        open={!!editing}
        title={editing?.id ? "Edit worship room" : "Create worship room"}
        onClose={() => { setEditing(null); setRoomSongQuery(""); }}
      >
        {editing && (
          <form onSubmit={save} className="scrollbar-hidden max-h-[78vh] space-y-4 overflow-y-auto pr-1">
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
            <fieldset><legend className="label">Songs for this room</legend><label className="relative mb-3 block"><Search className="absolute left-3 top-3.5 muted" size={17}/><input className="field !pl-10" value={roomSongQuery} onChange={event => setRoomSongQuery(event.target.value)} placeholder="Search song title..."/></label>{songsLoading ? <p className="rounded-xl border p-4 text-center text-sm muted">Searching songs...</p> : songCatalog.length ? <div className="scrollbar-hidden max-h-[180px] space-y-2 overflow-y-auto overscroll-contain rounded-xl border p-3">{songCatalog.map(song => { const selected = editing.songs?.find(item => String(item.id) === String(song.id)); const checked = Boolean(selected); const selectedKey = selected?.selectedKey || selected?.defaultKey || song.defaultKey; return <div key={song.id} className={`grid min-h-[70px] items-center gap-2 rounded-lg p-2 text-sm transition sm:grid-cols-[1fr_120px] ${checked ? "bg-brand-500/10 text-brand-500" : "hover:bg-slate-100 dark:hover:bg-slate-900"}`}><label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={checked} onChange={event => setEditing(current => current ? { ...current, songs: event.target.checked ? [...(current.songs || []), { ...song, selectedKey: song.defaultKey }] : (current.songs || []).filter(item => String(item.id) !== String(song.id)) } : current)}/><span className="min-w-0"><b className="block truncate">{song.title}</b><span className="text-xs muted">{song.artist} • Default {song.defaultKey}</span></span></label>{checked && <ModernSelect ariaLabel={`Key for ${song.title}`} options={[...new Set([selectedKey, ...musicalKeys])].map(value => ({ value }))} value={selectedKey} onValueChange={value => setEditing(current => current ? { ...current, songs: (current.songs || []).map(item => String(item.id) === String(song.id) ? { ...item, selectedKey: value } : item) } : current)}/>}</div>; })}</div> : <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500">{roomSongQuery.trim() ? "Lagu tidak ditemukan." : "Belum ada lagu. Tambahkan lagu dari menu Songs terlebih dahulu."}</p>}<p className="mt-2 text-xs muted">{editing.songs?.length || 0} song(s) selected</p></fieldset>
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
