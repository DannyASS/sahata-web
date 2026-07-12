import { ArrowDown, ArrowUp, Eye, Plus, Trash2, Zap } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { ConfirmModal, Modal, ModernSelect, PageHeader } from "../components/ui";
import { useToast } from "../contexts/AppContexts";
import type { Cue } from "../types";
import { endpoints } from "../lib/api";
const channels = ["All Team", "Band", "Vocal", "Production", "Multimedia", "Sound"];
export function Cues() {
  const { show } = useToast();
  const [list, setList] = useState<Cue[]>([]);
  // Toast callback is intentionally excluded to avoid refetching on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { endpoints.cues().then(data => setList(data || [])).catch(error => show(error instanceof Error ? error.message : "Gagal memuat cue", "error")); }, []);
  const [edit, setEdit] = useState<Cue | null>(null);
  const [preview, setPreview] = useState<Cue | null>(null);
  const [remove, setRemove] = useState<Cue | null>(null);
  const move = (i: number, d: number) => {
    const n = [...list];
    const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    setList(n);
  };
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!edit) return;
    const data = new FormData(e.currentTarget);
    const next = {
      ...edit,
      id: edit.id,
      label: String(data.get("label")),
      category: String(data.get("category")),
      priority: String(data.get("priority")) as Cue["priority"],
      channel: String(data.get("channel")),
      vibration: String(data.get("vibration")),
    };
    try {
      const saved = edit.id
        ? await endpoints.updateCue({ ...next, sortOrder: list.findIndex(c => c.id === edit.id) + 1 })
        : await endpoints.createCue({ label: next.label, category: next.category, priority: next.priority, channel: next.channel, vibration: next.vibration, sortOrder: list.length + 1 });
      setList(current => edit.id ? current.map(cue => cue.id === saved.id ? saved : cue) : [...current, saved]);
      setEdit(null);
      show("Cue preset saved");
    } catch (error) { show(error instanceof Error ? error.message : "Gagal menyimpan cue", "error"); }
  };
  return (
    <>
      <PageHeader
        title="Cue Presets"
        description="Arrange fast, consistent directions for every service."
        action={
          <button
            className="btn-primary"
            onClick={() =>
              setEdit({
                id: "",
                label: "",
                category: "Song Structure",
                priority: "Normal",
                channel: "All Team",
                vibration: "Short pulse",
              })
            }
          >
            <Plus size={18} /> Create cue
          </button>
        }
      />
      <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {[
          "All",
          "Song Structure",
          "Dynamic",
          "Direction",
          "Emergency",
          "Production",
        ].map((x) => (
          <button
            className={`btn-secondary whitespace-nowrap !min-h-9 !py-1.5 text-sm ${x === "All" ? "border-brand-500 text-brand-500" : ""}`}
            key={x}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((c, i) => (
          <article className="surface flex items-center gap-3 p-4" key={c.id}>
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${c.priority === "Emergency" ? "bg-red-500/15 text-red-500" : "bg-brand-500/10 text-brand-500"}`}
            >
              <Zap size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{c.label}</h3>
              <p className="truncate text-xs muted">
                {c.category} • {c.channel} • {c.vibration}
              </p>
            </div>
            <div className="flex">
              <button
                className="btn-secondary !h-9 !w-9 !min-h-0 !p-0"
                onClick={() => move(i, -1)}
                aria-label="Move up"
              >
                <ArrowUp size={15} />
              </button>
              <button
                className="btn-secondary !h-9 !w-9 !min-h-0 !p-0"
                onClick={() => move(i, 1)}
                aria-label="Move down"
              >
                <ArrowDown size={15} />
              </button>
              <button
                className="btn-secondary !h-9 !w-9 !min-h-0 !p-0"
                onClick={() => setPreview(c)}
                aria-label="Preview"
              >
                <Eye size={15} />
              </button>
              <button
                className="btn-secondary !h-9 !min-h-0 !px-2 text-xs"
                onClick={() => setEdit(c)}
              >
                Edit
              </button>
              <button
                className="btn-secondary !h-9 !w-9 !min-h-0 !p-0 text-red-500"
                onClick={() => setRemove(c)}
                aria-label="Delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      <Modal
        open={!!edit}
        title={edit?.id ? "Edit cue preset" : "Create cue preset"}
        onClose={() => setEdit(null)}
      >
        {edit && (
          <form className="space-y-4" onSubmit={save}>
            <label>
              <span className="label">Cue message</span>
              <input
                className="field"
                name="label"
                required
                defaultValue={edit.label}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="label">Category</span>
                <ModernSelect name="category" defaultValue={edit.category} options={["Song Structure", "Dynamic", "Direction", "Emergency", "Production"].map(value => ({ value }))} />
              </label>
              <label>
                <span className="label">Priority</span>
                <ModernSelect name="priority" defaultValue={edit.priority} options={["Normal", "High", "Emergency"].map(value => ({ value }))} />
              </label>
              <label>
                <span className="label">Target channel</span>
                <ModernSelect name="channel" defaultValue={edit.channel} options={channels.map(value => ({ value }))} />
              </label>
              <label>
                <span className="label">Vibration pattern</span>
                <ModernSelect name="vibration" defaultValue={edit.vibration} options={["Short pulse", "Double pulse", "Long pulse", "None"].map(value => ({ value }))} />
              </label>
            </div>
            <button className="btn-primary w-full">Save preset</button>
          </form>
        )}
      </Modal>
      <Modal
        open={!!preview}
        title="Cue preview"
        onClose={() => setPreview(null)}
      >
        <div className="grid min-h-64 place-items-center rounded-2xl bg-slate-950 text-center text-white">
          <div>
            <Zap
              className="mx-auto mb-4 animate-slow-pulse text-brand-400"
              size={42}
            />
            <p className="text-4xl font-black">
              {preview?.label.toUpperCase()}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Target: {preview?.channel}
            </p>
          </div>
        </div>
      </Modal>
      <ConfirmModal
        open={!!remove}
        title="Delete cue preset?"
        description={`Remove ${remove?.label} from your quick cues.`}
        onClose={() => setRemove(null)}
        onConfirm={async () => {
          if (!remove) return; try { await endpoints.deleteCue(remove.id); setList(x => x.filter(c => c.id !== remove.id)); setRemove(null); show("Cue removed", "warning"); } catch (error) { show(error instanceof Error ? error.message : "Gagal menghapus cue", "error"); }
        }}
      />
    </>
  );
}
