import {
  Moon,
  Sun,
  Wifi,
  WifiOff,
  Radio,
  Users,
  Copy,
  X,
  Music2,
  CheckCircle2,
  AlertTriangle,
  LoaderCircle,
  ChevronDown,
} from "lucide-react";
import { useTheme, useToast } from "../contexts/AppContexts";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TeamMember, WorshipRoom } from "../types";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-violet text-slate-950 shadow-glow">
        <Radio size={22} />
      </span>
      {!compact && (
        <span>
          <b className="block leading-tight">Church</b>
          <span className="text-xs muted">Worship Connect</span>
        </span>
      )}
    </div>
  );
}
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="btn-secondary !h-11 !w-11 !p-0"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
const statusStyle: Record<string, string> = {
  connected: "bg-emerald-500/15 text-emerald-500",
  Live: "bg-emerald-500/15 text-emerald-500",
  listening: "bg-cyan-500/15 text-cyan-500",
  weak: "bg-amber-500/15 text-amber-500",
  Scheduled: "bg-blue-500/15 text-blue-500",
  muted: "bg-slate-500/15 text-slate-500",
  disconnected: "bg-red-500/15 text-red-500",
  Completed: "bg-slate-500/15 text-slate-500",
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`chip ${statusStyle[status] || "bg-slate-500/15 text-slate-500"}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
export function ConnectionIndicator({
  label = "Connected",
}: {
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-emerald-500">
      <Wifi size={17} />
      <span>{label}</span>
    </div>
  );
}
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1 muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function StatCard({
  label,
  value,
  icon,
  trend,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  trend?: string;
}) {
  return (
    <div className="surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="muted text-sm">{label}</span>
        <span className="rounded-xl bg-brand-500/10 p-2 text-brand-500">
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {trend && <div className="mt-1 text-xs text-emerald-500">{trend}</div>}
    </div>
  );
}
export function RoomCard({
  room,
  onJoin,
  onEdit,
  onDelete,
}: {
  room: WorshipRoom;
  onJoin: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { show } = useToast();
  const copy = (text: string, msg: string) => {
    navigator.clipboard?.writeText(text);
    show(msg);
  };
  return (
    <article className="surface p-5">
      <div className="mb-4 flex justify-between gap-4">
        <div>
          <StatusBadge status={room.status} />
          <h3 className="mt-3 font-bold">{room.name}</h3>
          <p className="mt-1 text-sm muted">
            {room.date} • {room.startTime}–{room.endTime}
          </p>
        </div>
        <div className="rounded-xl bg-slate-100 p-3 text-center dark:bg-slate-900">
          <span className="block text-xs muted">Code</span>
          <b className="text-sm">{room.code}</b>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-3 text-sm muted">
        <span className="flex gap-1">
          <Users size={16} />
          {room.members}
        </span>
        <span>{room.channels.join(" • ")}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary flex-1" onClick={onJoin}>
          Join room
        </button>
        <button
          className="btn-secondary !px-3"
          onClick={() => copy(room.code, "Room code copied")}
          aria-label="Copy code"
        >
          <Copy size={17} />
        </button>
        <button
          className="btn-secondary !px-3"
          onClick={() =>
            copy(
              `${location.origin}/join?code=${room.code}`,
              "Invitation link copied",
            )
          }
          aria-label="Copy invitation link"
        >
          <Users size={17} />
        </button>
        {onEdit && (
          <button className="btn-secondary text-sm" onClick={onEdit}>
            Edit
          </button>
        )}
        {onDelete && (
          <button
            className="btn-secondary text-sm text-red-500"
            onClick={onDelete}
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
export function MemberCard({
  member,
  actions = true,
}: {
  member: TeamMember;
  actions?: boolean;
}) {
  return (
    <article className="surface p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500/30 to-violet/30 font-bold">
          {member.name
            .split(" ")
            .map((x) => x[0])
            .slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="truncate font-semibold">{member.name}</h3>
              <p className="text-xs muted">
                {member.role} • {member.channel}
              </p>
            </div>
            <StatusBadge status={member.status} />
          </div>
          <div className="mt-3 flex gap-4 text-xs muted">
            <span>{member.headset ? "🎧 Headset" : "No headset"}</span>
            <span>🔋 {member.battery}%</span>
          </div>
        </div>
      </div>
      {actions && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button className="btn-secondary !min-h-9 !px-2 !py-1 text-xs">
            Mute
          </button>
          <button className="btn-secondary !min-h-9 !px-2 !py-1 text-xs">
            Move
          </button>
          <button className="btn-secondary !min-h-9 !px-2 !py-1 text-xs">
            Direct cue
          </button>
        </div>
      )}
    </article>
  );
}
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="surface grid min-h-52 place-items-center p-8 text-center">
      <div>
        <Music2 className="mx-auto mb-3 text-slate-400" />
        <h3 className="font-bold">{title}</h3>
        <p className="mt-1 text-sm muted">{description}</p>
      </div>
    </div>
  );
}
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full rounded-t-3xl border bg-white p-5 shadow-2xl dark:bg-panel sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            className="btn-secondary !h-10 !w-10 !p-0"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function ConfirmModal({
  open,
  title,
  description,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="mb-6 muted">{description}</p>
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn bg-red-600 text-white hover:bg-red-500"
          onClick={onConfirm}
        >
          Confirm delete
        </button>
      </div>
    </Modal>
  );
}
export function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}
export function DeviceResult({ status }: { status: string }) {
  return status === "Not tested" ? (
    <LoaderCircle size={18} className="muted" />
  ) : status === "Warning" || status === "Failed" ? (
    <AlertTriangle size={18} className="text-amber-500" />
  ) : (
    <CheckCircle2 size={18} className="text-emerald-500" />
  );
}
export { WifiOff };

export type SelectOption = { value: string; label?: string };
export function ModernSelect({ options, name, value, defaultValue, onValueChange, className = "", disabled = false, ariaLabel }: { options: SelectOption[]; name?: string; value?: string | number; defaultValue?: string | number; onValueChange?: (value: string) => void; className?: string; disabled?: boolean; ariaLabel?: string }) {
  const controlled = value !== undefined; const [internal, setInternal] = useState(String(value ?? defaultValue ?? options[0]?.value ?? "")); const [open, setOpen] = useState(false); const root = useRef<HTMLDivElement>(null); const selected = controlled ? String(value) : internal;
  useEffect(() => { const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); }; window.addEventListener("pointerdown", close); return () => window.removeEventListener("pointerdown", close); }, []);
  const choose = (next: string) => { if (!controlled) setInternal(next); onValueChange?.(next); setOpen(false); };
  return <div ref={root} className={`relative ${className}`}>
    {name && <input type="hidden" name={name} value={selected} />}
    <button type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} className="field flex items-center justify-between !pr-3 text-left font-medium" onClick={() => setOpen(current => !current)}><span className="truncate">{options.find(option => option.value === selected)?.label || selected}</span><ChevronDown size={17} className={`shrink-0 text-brand-500 transition ${open ? "rotate-180" : ""}`} /></button>
    {open && <div role="listbox" className="absolute z-[90] mt-2 max-h-64 w-full min-w-max overflow-y-auto rounded-xl border bg-white p-1.5 shadow-2xl dark:bg-slate-900">{options.map(option => <button type="button" role="option" aria-selected={selected === option.value} key={option.value} className={`flex min-h-10 w-full items-center justify-between gap-4 rounded-lg px-3 text-left text-sm transition ${selected === option.value ? "bg-brand-500 font-semibold text-slate-950" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`} onClick={() => choose(option.value)}><span>{option.label || option.value}</span>{selected === option.value && <CheckCircle2 size={15} />}</button>)}</div>}
  </div>;
}
