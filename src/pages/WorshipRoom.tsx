import {
  Activity,
  ArrowLeft,
  Check,
  Headphones,
  HelpCircle,
  LogOut,
  Mic2,
  RefreshCw,
  Send,
  Settings,
  Users,
  Volume2,
  Zap,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Brand,
  ConnectionIndicator,
  MemberCard,
  ModernSelect,
  StatusBadge,
  ThemeToggle,
} from "../components/ui";
import { useAuth, useRoom, useToast } from "../contexts/AppContexts";
import { endpoints, roomEventsUrl, type RoomSignal } from "../lib/api";
import type { ActivityLog, Cue, Status, TeamMember } from "../types";
const peerConfig: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
export function WorshipRoom() {
  const { id } = useParams();
  const nav = useNavigate();
  const { state, dispatch, setMembers, setActivity } = useRoom();
  const { user } = useAuth();
  const { show } = useToast();
  const [cues, setCues] = useState<Cue[]>([]);
  const [loggedMember, setLoggedMember] = useState<TeamMember | null>(null);
  const [activeDirectors, setActiveDirectors] = useState<{ clientId: string; name: string; role: string }[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState("");
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [incomingAudio, setIncomingAudio] = useState(false);
  const [director, setDirector] = useState(() => Boolean(user) && user?.role !== "Member");
  const [channel, setChannel] = useState("All Team");
  const [activeCue, setActiveCue] = useState("");
  const [cueSender, setCueSender] = useState({ name: "Music Director", role: "Music Director" });
  const [cueVisible, setCueVisible] = useState(false);
  const [repeat, setRepeat] = useState(2);
  const [talking, setTalking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const directorAudioRef = useRef(new Map<string, HTMLAudioElement>());
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const peerStatsTimersRef = useRef(new Map<string, number>());
  const peerDisconnectTimersRef = useRef(new Map<string, number>());
  const micStreamRef = useRef<MediaStream | null>(null);
  const pendingIceRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const signalHandlerRef = useRef<(signal: RoomSignal) => void>(() => {});
  const joinedMember = (() => { try { return JSON.parse(sessionStorage.getItem("sahata-joined-member") || "null") as { id?: string; role?: string; channel?: string } | null; } catch { return null; } })();
  const memberPeerId = joinedMember?.id ? String(joinedMember.id) : loggedMember?.id ? String(loggedMember.id) : user?.id ? `user-${user.id}` : "guest";
  const clientId = director ? `director-${user?.id || "host"}` : `member-${memberPeerId}`;
  const room = state.rooms.find((r) => r.id === id) || state.rooms[0];
  const channels = room?.channels?.length ? ["All Team", ...room.channels.filter(c => c !== "All Team")] : ["All Team"];
  const sendSignal = (targetId: string, type: RoomSignal["type"], data: RoomSignal["data"]) => id ? endpoints.signal(id, { clientId, targetId, type, data }) : Promise.resolve();
  const flushIce = async (peerId: string, peer: RTCPeerConnection) => { for (const candidate of pendingIceRef.current.get(peerId) || []) await peer.addIceCandidate(candidate); pendingIceRef.current.delete(peerId); };
  const peerMemberId = (peerId: string) => peerId.replace(/^member-/, "");
  const updatePeerStatus = (peerId: string, status: Status) => setMembers(current => current.map(member => String(member.id) === peerMemberId(peerId) ? { ...member, status, lastActive: new Date().toISOString() } : member));
  const stopPeerMonitoring = (peerId: string) => {
    window.clearInterval(peerStatsTimersRef.current.get(peerId)); peerStatsTimersRef.current.delete(peerId);
    window.clearTimeout(peerDisconnectTimersRef.current.get(peerId)); peerDisconnectTimersRef.current.delete(peerId);
  };
  const monitorPeerQuality = (peerId: string, peer: RTCPeerConnection) => {
    window.clearInterval(peerStatsTimersRef.current.get(peerId));
    const timer = window.setInterval(() => { void peer.getStats().then(stats => {
      let weak = false;
      stats.forEach(raw => {
        const report = raw as RTCStats & { kind?: string; roundTripTime?: number; jitter?: number; packetsLost?: number; packetsReceived?: number };
        if (report.type !== "remote-inbound-rtp" || report.kind !== "audio") return;
        const total = (report.packetsReceived || 0) + (report.packetsLost || 0);
        const loss = total > 0 ? (report.packetsLost || 0) / total : 0;
        weak ||= loss > 0.05 || (report.jitter || 0) > 0.05 || (report.roundTripTime || 0) > 0.3;
      });
      if (peer.connectionState === "connected") updatePeerStatus(peerId, weak ? "weak" : "connected");
    }).catch(() => updatePeerStatus(peerId, "weak")); }, 5000);
    peerStatsTimersRef.current.set(peerId, timer);
  };
  const ensureMicStream = async () => {
    if (micStreamRef.current?.active) return micStreamRef.current;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("Microphone diblokir browser. Buka halaman MD melalui http://localhost:5173 atau gunakan HTTPS.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    stream.getAudioTracks().forEach(track => { track.enabled = false; }); micStreamRef.current = stream; return stream;
  };
  const createDirectorPeer = async (memberId: string, offer: RTCSessionDescriptionInit) => {
    const stream = await ensureMicStream();
    stream.getAudioTracks().forEach(track => { track.enabled = talking; });
    stopPeerMonitoring(memberId); peersRef.current.get(memberId)?.close();
    const peer = new RTCPeerConnection(peerConfig); peersRef.current.set(memberId, peer);
    updatePeerStatus(memberId, "weak");
    stream.getAudioTracks().forEach(track => peer.addTrack(track, stream!));
    peer.onicecandidate = event => { if (event.candidate) void sendSignal(memberId, "ice", event.candidate.toJSON()); };
    const trackConnection = () => {
      const state = peer.connectionState;
      if (state === "connected") { window.clearTimeout(peerDisconnectTimersRef.current.get(memberId)); peerDisconnectTimersRef.current.delete(memberId); updatePeerStatus(memberId, "connected"); monitorPeerQuality(memberId, peer); }
      else if (state === "failed" || state === "closed") { stopPeerMonitoring(memberId); updatePeerStatus(memberId, "disconnected"); }
      else if (state === "disconnected") { updatePeerStatus(memberId, "weak"); window.clearTimeout(peerDisconnectTimersRef.current.get(memberId)); peerDisconnectTimersRef.current.set(memberId, window.setTimeout(() => { if (peer.connectionState === "disconnected") updatePeerStatus(memberId, "disconnected"); }, 8000)); }
      else updatePeerStatus(memberId, "weak");
    };
    peer.onconnectionstatechange = trackConnection;
    peer.oniceconnectionstatechange = trackConnection;
    await peer.setRemoteDescription(offer); await flushIce(memberId, peer);
    const answer = await peer.createAnswer(); await peer.setLocalDescription(answer); await sendSignal(memberId, "answer", answer);
  };
  const connectToDirector = async (sourceId: string) => {
    if (!id || sourceId === clientId) return;
    const key = `receive:${sourceId}`; const current = peersRef.current.get(key); if (current && ["new", "connecting", "connected"].includes(current.connectionState)) return; current?.close();
    const peer = new RTCPeerConnection(peerConfig); peersRef.current.set(key, peer); peer.addTransceiver("audio", { direction: "recvonly" });
    peer.onicecandidate = event => { if (event.candidate) void sendSignal(sourceId, "ice", event.candidate.toJSON()); };
    peer.ontrack = event => { let audio = directorAudioRef.current.get(sourceId); if (!audio) { audio = new Audio(); audio.autoplay = true; audio.setAttribute("playsinline", "true"); directorAudioRef.current.set(sourceId, audio); } audio.srcObject = event.streams[0]; audio.muted = false; audio.volume = 1; setIncomingAudio(true); void audio.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true)); };
    const offer = await peer.createOffer(); await peer.setLocalDescription(offer); await sendSignal(sourceId, "offer", offer);
  };
  useEffect(() => {
    signalHandlerRef.current = signal => {
      if (signal.clientId === clientId || signal.targetId !== clientId) return;
      void (async () => {
        if (director && signal.type === "offer") await createDirectorPeer(signal.clientId, signal.data as RTCSessionDescriptionInit);
        else if (signal.type === "answer") { const key = `receive:${signal.clientId}`; const peer = peersRef.current.get(key); if (peer) { await peer.setRemoteDescription(signal.data as RTCSessionDescriptionInit); await flushIce(key, peer); } }
        else if (signal.type === "ice") { const key = peersRef.current.has(signal.clientId) ? signal.clientId : `receive:${signal.clientId}`; const peer = peersRef.current.get(key); if (peer?.remoteDescription) await peer.addIceCandidate(signal.data as RTCIceCandidateInit); else pendingIceRef.current.set(key, [...(pendingIceRef.current.get(key) || []), signal.data as RTCIceCandidateInit]); }
      })().catch(error => show(error instanceof Error ? error.message : "Koneksi audio gagal", "error"));
    };
  });
  useEffect(() => { endpoints.cues().then(setCues).catch(() => setCues([])); }, []);
  useEffect(() => {
    if (!id) return; endpoints.directors(id).then(setActiveDirectors).catch(() => setActiveDirectors([]));
    if (director) endpoints.enterDirectorPresence(id).then(result => setActiveDirectors(result.directors)).catch(error => show(error instanceof Error ? error.message : "Gagal mendaftarkan director", "error"));
  // Director registration follows room and authenticated identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, director, user?.id]);
  useEffect(() => {
    if (!id || user?.role !== "Member") return;
    endpoints.enterMemberPresence(id).then(member => { setLoggedMember(member); setMembers(current => current.some(item => item.id === member.id) ? current.map(item => item.id === member.id ? member : item) : [...current, member]); }).catch(error => show(error instanceof Error ? error.message : "Gagal menghubungkan member", "error"));
  // Presence is tied to the room/user identity and must only run when either changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id, user?.role]);
  useEffect(() => {
    if (!id) return;
    const events = new EventSource(roomEventsUrl(id));
    let hideTimer: number | undefined;
    events.addEventListener("cue", event => {
      const activity = JSON.parse((event as MessageEvent).data) as ActivityLog;
      setActiveCue(activity.message.toUpperCase());
      setCueSender({ name: activity.sender, role: activity.senderRole || "Music Director" });
      setCueVisible(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setCueVisible(false), 5000);
      if (navigator.vibrate) navigator.vibrate([180, 80, 180]);
    });
    events.addEventListener("signal", event => signalHandlerRef.current(JSON.parse((event as MessageEvent).data) as RoomSignal));
    events.addEventListener("presence", event => {
      const presence = JSON.parse((event as MessageEvent).data) as { action: "joined" | "left"; memberId?: number | string; member?: TeamMember };
      if (presence.action === "joined" && presence.member) setMembers(current => current.some(member => member.id === presence.member?.id) ? current : [...current, presence.member!]);
      if (presence.action === "left" && presence.memberId != null) { const peerId = `member-${presence.memberId}`; stopPeerMonitoring(peerId); peersRef.current.get(peerId)?.close(); peersRef.current.delete(peerId); setMembers(current => current.filter(member => String(member.id) !== String(presence.memberId))); }
    });
    events.addEventListener("director", event => { const data = JSON.parse((event as MessageEvent).data) as { directors: { clientId: string; name: string; role: string }[] }; setActiveDirectors(data.directors || []); });
    events.addEventListener("speaker", event => { const data = JSON.parse((event as MessageEvent).data) as { clientId: string }; setActiveSpeaker(data.clientId || ""); });
    events.onerror = () => console.warn("Koneksi realtime cue terputus; browser akan mencoba tersambung kembali.");
    return () => { window.clearTimeout(hideTimer); events.close(); };
  }, [id, setMembers]);
  // Receiver negotiation intentionally reuses the latest signaling callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!id) return; const connect = () => activeDirectors.forEach(item => { if (item.clientId !== clientId) void connectToDirector(item.clientId); }); const timeout = window.setTimeout(connect, 300); const retry = window.setInterval(connect, 5000); return () => { window.clearTimeout(timeout); window.clearInterval(retry); }; }, [id, clientId, activeDirectors]);
  useEffect(() => {
    localStorage.setItem("sahata-room-role", director ? "director" : "member");
  }, [director]);
  useEffect(() => {
    if (talking)
      timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    else {
      clearInterval(timer.current);
    }
    return () => clearInterval(timer.current);
  }, [talking]);
  useEffect(() => { micStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = talking; }); }, [talking]);
  const sendCue = async (label: string) => {
    const message = `${label}${repeat > 1 && ["Bridge", "Chorus", "Repeat"].includes(label) ? ` ×${repeat}` : ""}`;
    if (!room) return;
    try {
      const created = await endpoints.createActivity({ roomId: room.id, sender: user?.name || "Music Director", senderRole: user?.role || "Music Director", message, target: channel, received: true });
      setActivity(current => [created, ...current]);
      setActiveCue(message.toUpperCase()); setCueSender({ name: user?.name || "Music Director", role: user?.role || "Music Director" }); setCueVisible(true);
      show(`${message} sent to ${channel}`); window.setTimeout(() => setCueVisible(false), 5000);
    } catch (error) { show(error instanceof Error ? error.message : "Cue gagal dikirim", "error"); }
  };
  const leave = async () => {
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    peersRef.current.forEach(peer => peer.close());
    peersRef.current.clear();
    peerStatsTimersRef.current.forEach(timer => window.clearInterval(timer)); peerStatsTimersRef.current.clear();
    peerDisconnectTimersRef.current.forEach(timer => window.clearTimeout(timer)); peerDisconnectTimersRef.current.clear();
    directorAudioRef.current.forEach(audio => { audio.pause(); audio.srcObject = null; }); directorAudioRef.current.clear();
    if (director && id) { if (talking) await endpoints.speakerLock(id, "release").catch(() => {}); await endpoints.leaveDirectorPresence(id).catch(() => {}); }
    if (!user) {
      if (id && joinedMember?.id) {
        try { await endpoints.leaveRoom(id, joinedMember.id); }
        catch (error) { show(error instanceof Error ? error.message : "Gagal memperbarui status member", "error"); }
      }
      sessionStorage.removeItem("sahata-joined-room");
      sessionStorage.removeItem("sahata-joined-member");
      localStorage.removeItem("sahata-room-role");
    } else if (user.role === "Member" && id) {
      try { await endpoints.leaveMemberPresence(id); }
      catch (error) { show(error instanceof Error ? error.message : "Gagal memperbarui status member", "error"); }
      setLoggedMember(null);
    }
    show("You left the room", "warning");
    nav(user ? "/dashboard" : "/", { replace: true });
  };
  const enableIncomingAudio = () => {
    const attempts = [...directorAudioRef.current.values()].map(audio => audio.play());
    void Promise.allSettled(attempts).then(results => { const failed = results.some(result => result.status === "rejected"); setAudioBlocked(failed); show(failed ? "Browser masih memblokir audio" : "Audio enabled", failed ? "warning" : "success"); });
  };
  if (!room) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6 dark:bg-ink">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 animate-spin text-brand-500" size={32} />
          <p className="font-semibold">Memuat worship room...</p>
          <p className="mt-1 text-sm muted">Mengambil data terbaru dari server.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ink">
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur dark:bg-panel/95">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-3 py-3 sm:px-5">
          <button
            className="btn-secondary !h-11 !w-11 !p-0"
            onClick={leave}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="hidden sm:block">
            <Brand />
          </div>
          <div className="min-w-0 flex-1 sm:ml-4">
            <h1 className="truncate font-bold">{room.name}</h1>
            <div className="flex items-center gap-3 text-xs muted">
              <span>
                {room.date} • {room.startTime}
              </span>
              <span className="hidden sm:inline">Code: {room.code}</span>
            </div>
          </div>
          <ConnectionIndicator />
          <ThemeToggle />
          {user && user.role !== "Member" && <button
            className="btn-secondary hidden text-red-500 sm:inline-flex"
            onClick={leave}
          >
            <LogOut size={17} /> Leave
          </button>}
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-3 py-4 pb-28 sm:px-5 md:pb-8">
        {(audioBlocked || incomingAudio) && <div className="mb-4 flex items-center justify-between rounded-xl border border-brand-500/40 bg-brand-500/10 p-3"><span className="text-sm font-medium">{incomingAudio ? "Director audio ready" : "Waiting for director audio"}</span><button type="button" className="btn-primary !min-h-9 text-sm" onClick={enableIncomingAudio}><Headphones size={16} /> Enable Audio</button></div>}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusBadge status="Live" />
            <span className="flex items-center gap-1 text-sm muted">
              <Users size={16} />
              {state.members.filter((m) => m.status !== "disconnected").length}/
              {state.members.length} connected
            </span>
          </div>
          {user && user.role !== "Member" && <label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm dark:bg-panel">
            <span className="muted">Demo view</span>
            <ModernSelect className="w-44" options={[{ value: "director", label: "Music Director" }, { value: "member", label: "Member" }]} value={director ? "director" : "member"} onValueChange={value => setDirector(value === "director")} />
          </label>}
        </div>
        {director ? (
          <DirectorView
            channels={channels}
            cues={cues}
            talking={talking}
            seconds={seconds}
          onTalk={(value) => { void (async () => { if (!id) return; try { if (value) await ensureMicStream(); await endpoints.speakerLock(id, value ? "acquire" : "release"); micStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = value; }); if (!value) setSeconds(0); setTalking(value); } catch (error) { show(error instanceof Error ? error.message : "Director lain sedang berbicara", "warning"); } })(); }}
            channel={channel}
            setChannel={setChannel}
            activeCue={activeCue}
            cueVisible={cueVisible}
            sendCue={sendCue}
            repeat={repeat}
            setRepeat={setRepeat}
            activeSpeaker={activeSpeaker}
          />
        ) : (
          <MemberView
            activeCue={activeCue}
            cueVisible={cueVisible}
            cueSender={cueSender}
            role={joinedMember?.role || "Member"}
            channel={joinedMember?.channel || "All Team"}
            guest={!user || user.role === "Member"}
            onLeave={leave}
            onResponse={(text) => {
              show(`${text} response sent`);
              dispatch({
                type: "ADD_ACTIVITY",
                activity: {
                  id: crypto.randomUUID(),
                  time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  sender: "You",
                  message: text,
                  target: "Music Director",
                  received: true,
                },
              });
            }}
          />
        )}
      </main>
      {user && user.role !== "Member" && <MobileRoomNav />}
    </div>
  );
}
type DirectorProps = {
  channels: string[];
  cues: Cue[];
  talking: boolean;
  seconds: number;
  onTalk: (v: boolean) => void;
  channel: string;
  setChannel: (v: string) => void;
  activeCue: string;
  cueVisible: boolean;
  sendCue: (v: string) => void;
  repeat: number;
  setRepeat: (v: number) => void;
  activeSpeaker: string;
};
function DirectorView(p: DirectorProps) {
  const { state } = useRoom();
  const { show } = useToast();
  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <section className="space-y-5 xl:col-span-8">
        {p.activeSpeaker && <div className="surface border-brand-500 p-3 text-sm font-semibold text-brand-500">Active speaker: {p.activeSpeaker === "" ? "None" : p.activeSpeaker}</div>}
        <div className="surface overflow-hidden p-5">
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-brand-500">
                CLICK-TO-TALK CONTROL
              </p>
              <h2 className="mt-1 text-xl font-bold">Speak to {p.channel}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.channels.map((c) => (
                  <button
                    key={c}
                    onClick={() => p.setChannel(c)}
                    className={`btn !min-h-9 !px-3 !py-1.5 text-sm ${p.channel === c ? "bg-brand-500 text-slate-950" : "border bg-slate-100 dark:bg-slate-900"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs muted">
                {[
                  "Microphone ready",
                  "Headset connected",
                  "Noise suppression on",
                  "Low latency mode",
                ].map((x) => (
                  <span key={x} className="flex items-center gap-1.5">
                    <Check size={14} className="text-emerald-500" />
                    {x}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid place-items-center">
              <button
                aria-label={p.talking ? "Stop talking" : "Start talking"}
                aria-pressed={p.talking}
                onClick={() => p.onTalk(!p.talking)}
                className={`relative grid h-64 w-64 touch-manipulation select-none place-items-center rounded-full border-8 transition sm:h-52 sm:w-52 ${p.talking ? "scale-105 border-brand-400 bg-brand-500 text-slate-950 shadow-[0_0_0_20px_rgba(34,211,238,.12)]" : "border-slate-200 bg-slate-100 hover:border-brand-500/40 dark:border-slate-700 dark:bg-slate-900"}`}
              >
                <div className="text-center">
                  <Mic2 className="mx-auto mb-2" size={34} />
                  <b className="block">
                    {p.talking ? "TAP TO STOP" : "TAP TO TALK"}
                  </b>
                  <span className="text-xs opacity-70">
                    {p.talking
                      ? `00:${String(p.seconds).padStart(2, "0")}`
                      : "Ready"}
                  </span>
                </div>
              </button>
              {p.talking && <Waveform />}
            </div>
          </div>
        </div>
        {p.cueVisible && (
          <div className="surface border-brand-500 bg-brand-500/5 p-6 text-center">
            <p className="text-xs font-semibold text-brand-500">
              ACTIVE CUE • {p.channel}
            </p>
            <h2 className="mt-2 text-4xl font-black sm:text-5xl">
              {p.activeCue}
            </h2>
            <p className="mt-2 animate-pulse text-xs muted">
              📳 Vibration cue active
            </p>
          </div>
        )}
        <div className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Quick cues</h2>
              <p className="text-sm muted">Large controls for fast serving</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              Repeat
              <ModernSelect className="w-20" options={["1", "2", "3", "4"].map(value => ({ value }))} value={p.repeat} onValueChange={value => p.setRepeat(Number(value))} />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {p.cues.map((c) => (
              <button
                key={c.id}
                onClick={() => p.sendCue(c.label)}
                className={`min-h-16 rounded-xl border p-3 font-bold transition hover:-translate-y-0.5 active:scale-95 ${c.priority === "Emergency" ? "border-red-500/40 bg-red-500/10 text-red-500" : "bg-slate-50 hover:border-brand-500 dark:bg-slate-900"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <ModernSelect options={p.channels.map(value => ({ value, label: `Target: ${value}` }))} value={p.channel} onValueChange={p.setChannel} />
            <label className="flex items-center gap-2 rounded-xl border px-3 text-sm">
              <input type="checkbox" defaultChecked /> Vibration
            </label>
            <label className="flex items-center gap-2 rounded-xl border px-3 text-sm">
              <input type="checkbox" defaultChecked /> Sound
            </label>
            <label className="flex items-center gap-2 rounded-xl border px-3 text-sm">
              <input type="checkbox" /> Visual only
            </label>
          </div>
        </div>
        <CustomCue onSend={p.sendCue} />
        <section>
          <h2 className="mb-3 text-lg font-bold">Connected members</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {state.members.map((m) => (
              <MemberCard member={m} key={m.id} />
            ))}
          </div>
        </section>
      </section>
      <aside className="space-y-5 xl:col-span-4">
        <div className="surface p-5">
          <h2 className="mb-4 font-bold">Room activity</h2>
          <div className="max-h-[520px] space-y-1 overflow-y-auto">
            {state.activity.map((a) => (
              <div className="border-b py-3 last:border-0" key={a.id}>
                <div className="flex justify-between gap-2">
                  <b className="text-sm">{a.sender}</b>
                  <span className="text-xs muted">{a.createdAt ? new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : a.time}</span>
                </div>
                <p className="mt-1 text-sm">{a.message}</p>
                <p className="mt-1 text-xs text-emerald-500">
                  ✓ Received • {a.target}
                </p>
              </div>
            ))}
          </div>
        </div>
        <button
          className="btn-secondary w-full"
          onClick={() => show("All members notified")}
        >
          Notify all members
        </button>
      </aside>
    </div>
  );
}
function CustomCue({ onSend }: { onSend: (s: string) => void }) {
  const [msg, setMsg] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (msg.trim()) {
      onSend(msg);
      setMsg("");
    }
  };
  return (
    <form className="surface p-5" onSubmit={submit}>
      <h2 className="mb-4 font-bold">Custom cue</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <input
          className="field sm:col-span-2"
          placeholder="Type a clear direction…"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          required
        />
        <ModernSelect options={["Normal priority", "High priority", "Emergency"].map(value => ({ value }))} />
        <button className="btn-primary">
          <Send size={17} /> Send
        </button>
      </div>
    </form>
  );
}
function MemberView({
  activeCue,
  cueVisible,
  cueSender,
  role,
  channel,
  guest,
  onLeave,
  onResponse,
}: {
  activeCue: string;
  cueVisible: boolean;
  cueSender: { name: string; role: string };
  role: string;
  channel: string;
  guest: boolean;
  onLeave: () => void;
  onResponse: (s: string) => void;
}) {
  const [volume, setVolume] = useState(72);
  const { show } = useToast();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Connection", "Excellent"],
            ["Your role", role],
            ["Channel", channel],
            ["Audio", "Good"],
          ] as const
        ).map(([a, b]) => (
          <div className="surface p-4" key={a}>
            <p className="text-xs muted">{a}</p>
            <b className="mt-1 block text-sm">{b}</b>
          </div>
        ))}
      </div>
      <div
        className={`surface relative grid min-h-[360px] place-items-center overflow-hidden p-8 text-center ${cueVisible ? "border-brand-500 shadow-glow" : ""}`}
      >
        <div
          className={`absolute h-64 w-64 rounded-full bg-brand-500/10 blur-2xl ${cueVisible ? "animate-pulse" : ""}`}
        />
        <div className="relative">
          <p className="text-sm font-semibold text-brand-500">CURRENT CUE</p>
          <Zap className="mx-auto my-5 text-brand-500" size={48} />
          <h2 className="text-5xl font-black sm:text-7xl">
            {cueVisible ? activeCue : "STANDBY"}
          </h2>
          <p className="mt-4 muted">from {cueSender.name} • {cueSender.role} • just now</p>
          {cueVisible && (
            <p className="mt-4 text-sm text-brand-500">
              📳 Vibrating • disappears in 5s
            </p>
          )}
        </div>
      </div>
      {!guest && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["OK", Check],
            ["Repeat Please", RefreshCw],
            ["Audio Issue", Volume2],
            ["Need Help", HelpCircle],
          ] as const
        ).map(([label, Icon]) => (
          <button
            key={String(label)}
            className="btn-secondary min-h-16 flex-col text-sm"
            onClick={() => onResponse(String(label))}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>}
      {!guest && <div className="surface p-5">
        <div className="flex items-center justify-between">
          <label className="font-semibold" htmlFor="comm-volume">
            Communication volume
          </label>
          <b>{volume}%</b>
        </div>
        <input
          id="comm-volume"
          className="mt-4 w-full accent-cyan-500"
          type="range"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>}
      <div className={guest ? "flex justify-end" : "grid grid-cols-3 gap-3"}>
        {!guest && <>
        <button
          className="btn-secondary"
          onClick={() => show("Connection restored")}
        >
          <RefreshCw size={17} />{" "}
          <span className="hidden sm:inline">Reconnect</span>
        </button>
        <button
          className="btn-secondary"
          onClick={() => show("Headset switched")}
        >
          <Headphones size={17} />{" "}
          <span className="hidden sm:inline">Switch headset</span>
        </button>
        </>}
        <button className="btn-secondary text-red-500" onClick={onLeave}>
          <LogOut size={17} /> Leave
        </button>
      </div>
    </div>
  );
}
function Waveform() {
  return (
    <div className="mt-5 flex h-8 items-center gap-1">
      {[12, 25, 18, 32, 20, 28, 14, 26, 16, 30, 18].map((h, i) => (
        <span
          key={i}
          className="w-1 animate-pulse rounded-full bg-brand-500"
          style={{ height: h, animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}
function MobileRoomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-white pb-[max(.25rem,env(safe-area-inset-bottom))] dark:bg-panel md:hidden">
      {(
        [
          [Mic2, "Talk"],
          [Zap, "Cue"],
          [Users, "Team"],
          [Activity, "Activity"],
          [Settings, "More"],
        ] as const
      ).map(([Icon, label], i) => (
        <button
          key={String(label)}
          className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] ${i === 0 ? "text-brand-500" : "muted"}`}
        >
          <Icon size={21} />
          {label}
        </button>
      ))}
    </nav>
  );
}
