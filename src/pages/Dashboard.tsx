import {
  Radio,
  Users,
  Mic2,
  Activity,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState, PageHeader, StatCard, RoomCard, MemberCard } from "../components/ui";
import { useAuth, useRoom } from "../contexts/AppContexts";
import { useLanguage } from "../i18n";
export function Dashboard() {
  const { state } = useRoom();
  const { user } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigate();
  const liveRooms = state.rooms.filter(room => room.status === "Live");
  const activeRoom = liveRooms[0] || state.rooms[0];
  const connectedMembers = state.members.filter(member => member.status !== "disconnected");
  const onlineSpeakers = state.members.filter(member => member.status === "connected" || member.status === "listening");
  const channelCount = new Set(state.rooms.flatMap(room => room.channels)).size;
  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.name || ""}`}
        description="Ringkasan room dan tim pelayanan dari server."
        action={activeRoom ?
          <button
            className="btn-primary"
            onClick={() => nav(`/room/${activeRoom.id}`)}
          >
            Open {activeRoom.status === "Live" ? "live " : ""}room <ArrowRight size={17} />
          </button>
        : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Room"
          value={`${liveRooms.length} Live`}
          icon={<Radio />}
          trend={liveRooms[0]?.name || "Tidak ada room live"}
        />
        <StatCard
          label={t("Connected Members")}
          value={`${connectedMembers.length} / ${state.members.length}`}
          icon={<Users />}
          trend={activeRoom ? activeRoom.name : "Belum ada room"}
        />
        <StatCard
          label={t("Online Speakers")}
          value={String(onlineSpeakers.length)}
          icon={<Mic2 />}
          trend={`${channelCount} channel tersedia`}
        />
        <StatCard
          label={t("Total Rooms")}
          value={String(state.rooms.length)}
          icon={<Activity />}
          trend={`${state.rooms.filter(room => room.status === "Scheduled").length} scheduled`}
        />
      </div>
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("Upcoming services")}</h2>
          <button
            className="text-sm font-semibold text-brand-500"
            onClick={() => nav("/rooms")}
          >
            {t("View all")}
          </button>
        </div>
        {state.rooms.length ? <div className="grid gap-4 lg:grid-cols-2">
          {state.rooms.slice(0, 4).map((r) => (
            <RoomCard room={r} key={r.id} onJoin={() => nav(`/room/${r.id}`)} />
          ))}
        </div> : <EmptyState title="Belum ada worship room" description="Buat room pertama dari halaman Worship Rooms." />}
      </section>
      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h2 className="mb-4 text-xl font-bold">{t("Team connection status")}</h2>
          {state.members.length ? <div className="grid gap-3 sm:grid-cols-2">
            {state.members.slice(0, 4).map((m) => (
              <MemberCard key={m.id} member={m} actions={false} />
            ))}
          </div> : <EmptyState title="Belum ada member" description="Pilih atau buat room lalu tambahkan anggota tim." />}
        </section>
        <section className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold">{t("Recent activity")}</h2>
          {state.activity.length ? <div className="surface divide-y p-1">
            {state.activity.slice(0, 5).map((a) => (
              <div className="flex gap-3 p-4" key={a.id}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500/10 text-brand-500">
                  <Calendar size={16} />
                </span>
                <div>
                  <p className="text-sm">
                    <b>{a.sender}</b> {a.message}
                  </p>
                  <p className="mt-1 text-xs muted">
                    {a.createdAt ? new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""} • {a.target}
                  </p>
                </div>
              </div>
            ))}
          </div> : <EmptyState title="Belum ada activity" description="Activity dari room aktif akan muncul di sini." />}
        </section>
      </div>
    </>
  );
}
