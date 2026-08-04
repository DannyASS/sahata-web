import {
  Activity,
  ArrowLeft,
  Check,
  Headphones,
  HelpCircle,
  LogOut,
  Mic2,
  Music2,
  RefreshCw,
  Send,
  Settings,
  Users,
  Volume2,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ConnectionState,
  Room as LiveKitRoom,
  RoomEvent,
  Track,
} from "livekit-client";
import {
  Brand,
  ConnectionIndicator,
  MemberCard,
  ModernSelect,
  StatusBadge,
  ThemeToggle,
} from "../components/ui";
import { useAuth, useRoom, useToast } from "../contexts/AppContexts";
import { endpoints, roomEventsUrl } from "../lib/api";
import { transposeChord, transposeKey, transposeSteps } from "../lib/chords";
import type {
  ActivityLog,
  Cue,
  Song,
  SongSection,
  TeamMember,
  WorshipRoom as WorshipRoomType,
} from "../types";
const serviceRoles = [
  "Worship Leader",
  "Singer",
  "Keyboardist",
  "Guitarist",
  "Bassist",
  "Drummer",
  "Sound Engineer",
  "Multimedia",
  "Lighting",
  "Stage Manager",
  "Member",
];
const guestChordRoles = ["keyboard", "keyboardist", "guitar", "guitarist", "bass", "bassist"];
type LiveKitStatus =
  "connecting" | "connected" | "reconnecting" | "disconnected" | "failed";
const liveKitRetryDelays = [0, 1_000, 2_000, 4_000, 8_000];
function microphoneAccessError(): string | null {
  if (!window.isSecureContext) {
    return "Microphone hanya dapat digunakan melalui HTTPS atau localhost. Buka web dengan https:// lalu coba lagi.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Browser tidak menyediakan akses microphone. Periksa izin microphone pada browser dan pastikan halaman tidak dibuka dari embedded browser.";
  }
  return null;
}

function microphonePublishError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError")
      return "Izin microphone ditolak. Izinkan microphone dari pengaturan browser lalu coba lagi.";
    if (error.name === "NotFoundError")
      return "Microphone tidak ditemukan pada perangkat ini.";
    if (error.name === "NotReadableError")
      return "Microphone sedang digunakan aplikasi lain atau tidak dapat dibaca.";
  }
  return error instanceof Error
    ? error.message
    : "Gagal mengaktifkan microphone";
}

export function WorshipRoom() {
  const { id } = useParams();
  const nav = useNavigate();
  const { state, dispatch, setMembers, setActivity } = useRoom();
  const { user } = useAuth();
  const { show } = useToast();
  const [cues, setCues] = useState<Cue[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentSection, setCurrentSection] = useState<SongSection | null>(
    null,
  );
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [livekitStatus, setLivekitStatus] =
    useState<LiveKitStatus>("connecting");
  const [livekitAttempt, setLivekitAttempt] = useState(1);
  const [livekitReconnectKey, setLivekitReconnectKey] = useState(0);
  const [activeSpeaker, setActiveSpeaker] = useState("");
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [incomingAudio, setIncomingAudio] = useState(false);
  const [memberViewMode, setMemberViewMode] = useState<"Band" | "Singers">(
    "Band",
  );
  const [director, setDirector] = useState(
    () => Boolean(user) && user?.role !== "Member",
  );
  const [channel, setChannel] = useState("All Team");
  const [activeCue, setActiveCue] = useState("");
  const [cueSender, setCueSender] = useState({
    name: "Music Director",
    role: "Music Director",
  });
  const [cueVisible, setCueVisible] = useState(false);
  const [repeat, setRepeat] = useState(1);
  const [talking, setTalking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const livekitRoomRef = useRef<LiveKitRoom | null>(null);
  const livekitAudioElementsRef = useRef(new Set<HTMLMediaElement>());
  const joinedMember = (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("sahata-joined-member") || "null",
      ) as { id?: string; role?: string; channel?: string } | null;
    } catch {
      return null;
    }
  })();
  const guestMemberId = joinedMember?.id ? String(joinedMember.id) : "";
  const viewerRole =
    user?.role === "Member" && memberViewMode === "Singers"
      ? "Singer"
      : joinedMember?.role || user?.role || "Member";
  const room = state.rooms.find((r) => r.id === id) || state.rooms[0];
  const channels = room?.channels?.length
    ? ["All Team", ...room.channels.filter((c) => c !== "All Team")]
    : ["All Team"];
  const microphoneReady = microphoneAccessError() === null;
  useEffect(() => {
    endpoints
      .cues()
      .then((data) => setCues((data || []).filter((cue) => cue.active)))
      .catch(() => setCues([]));
  }, []);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setSongs(room?.songs || []);
        setCurrentSong(room?.currentSong || null);
        setCurrentSection(
          room?.currentSong?.sections.find(
            (s) => String(s.id) === String(room.currentSongSectionId),
          ) || null,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [room?.songs, room?.currentSong, room?.currentSongSectionId]);
  useEffect(() => {
    if (!id) return;
    if (director)
      endpoints
        .enterDirectorPresence(id)
        .catch((error) =>
          show(
            error instanceof Error
              ? error.message
              : "Gagal mendaftarkan director",
            "error",
          ),
        );
    // Director registration follows room and authenticated identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, director, user?.id]);
  useEffect(() => {
    if (!id || user?.role !== "Member") return;
    endpoints
      .enterMemberPresence(id)
      .then((member) => {
        setMembers((current) =>
          current.some((item) => item.id === member.id)
            ? current.map((item) => (item.id === member.id ? member : item))
            : [...current, member],
        );
      })
      .catch((error) =>
        show(
          error instanceof Error ? error.message : "Gagal menghubungkan member",
          "error",
        ),
      );
    // Presence is tied to the room/user identity and must only run when either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id, user?.role]);
  useEffect(() => {
    if (!id || (!user && !guestMemberId)) return;
    let cancelled = false;
    const audioElements = livekitAudioElementsRef.current;
    let connectedOnce = false;
    let reconnectTimer: number | undefined;
    let activeTokenController: AbortController | undefined;
    let activeTokenTimeout: number | undefined;

    const clearAudioElements = () => {
      audioElements.forEach((element) => element.remove());
      audioElements.clear();
      setIncomingAudio(false);
    };

    const wait = (delay: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, delay));

    const configureRoom = (livekitRoom: LiveKitRoom) => {
      const isCurrentRoom = () =>
        !cancelled && livekitRoomRef.current === livekitRoom;
      livekitRoom.on(RoomEvent.TrackSubscribed, (track) => {
        if (!isCurrentRoom() || track.kind !== Track.Kind.Audio) return;
        const element = track.attach();
        element.autoplay = true;
        element.setAttribute("playsinline", "true");
        element.style.display = "none";
        document.body.appendChild(element);
        audioElements.add(element);
        setIncomingAudio(true);
        void element
          .play()
          .then(() => setAudioBlocked(false))
          .catch(() => setAudioBlocked(true));
      });
      livekitRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (!isCurrentRoom()) return;
        track.detach().forEach((element) => {
          audioElements.delete(element);
          element.remove();
        });
        if (audioElements.size === 0) setIncomingAudio(false);
      });
      livekitRoom.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        if (isCurrentRoom()) setAudioBlocked(!livekitRoom.canPlaybackAudio);
      });
      livekitRoom.on(RoomEvent.Reconnecting, () => {
        if (isCurrentRoom()) setLivekitStatus("reconnecting");
      });
      livekitRoom.on(RoomEvent.SignalReconnecting, () => {
        if (isCurrentRoom()) setLivekitStatus("reconnecting");
      });
      livekitRoom.on(RoomEvent.Reconnected, () => {
        if (!isCurrentRoom()) return;
        setLivekitStatus("connected");
        setAudioBlocked(!livekitRoom.canPlaybackAudio);
      });
      livekitRoom.on(RoomEvent.Disconnected, () => {
        if (!isCurrentRoom()) return;
        setLivekitStatus("disconnected");
        clearAudioElements();
        if (connectedOnce) {
          window.clearTimeout(reconnectTimer);
          reconnectTimer = window.setTimeout(
            () => setLivekitReconnectKey((key) => key + 1),
            1_000,
          );
        }
      });
      livekitRoom.on(RoomEvent.ConnectionStateChanged, (connectionState) => {
        if (!isCurrentRoom()) return;
        if (connectionState === ConnectionState.Connected)
          setLivekitStatus("connected");
        if (
          connectionState === ConnectionState.Reconnecting ||
          connectionState === ConnectionState.SignalReconnecting
        )
          setLivekitStatus("reconnecting");
      });
    };

    void (async () => {
      let lastError: unknown;
      for (
        let attempt = 0;
        attempt < liveKitRetryDelays.length && !cancelled;
        attempt += 1
      ) {
        if (liveKitRetryDelays[attempt] > 0)
          await wait(liveKitRetryDelays[attempt]);
        if (cancelled) return;

        setLivekitAttempt(attempt + 1);
        setLivekitStatus("connecting");
        setAudioBlocked(false);
        clearAudioElements();

        activeTokenController = new AbortController();
        activeTokenTimeout = window.setTimeout(
          () => activeTokenController?.abort(),
          10_000,
        );
        const livekitRoom = new LiveKitRoom({
          adaptiveStream: false,
          dynacast: false,
        });
        livekitRoomRef.current?.disconnect();
        livekitRoomRef.current = livekitRoom;
        configureRoom(livekitRoom);

        try {
          const connection = user
            ? await endpoints.livekitToken(id, activeTokenController.signal)
            : await endpoints.guestLivekitToken(
                id,
                guestMemberId,
                activeTokenController.signal,
              );
          window.clearTimeout(activeTokenTimeout);
          activeTokenController = undefined;
          activeTokenTimeout = undefined;
          if (cancelled) {
            livekitRoom.disconnect();
            return;
          }
          await livekitRoom.connect(connection.url, connection.token, {
            autoSubscribe: true,
            maxRetries: 0,
            websocketTimeout: 10_000,
          });
          if (cancelled) {
            livekitRoom.disconnect();
            return;
          }
          connectedOnce = true;
          setLivekitStatus("connected");
          setAudioBlocked(!livekitRoom.canPlaybackAudio);
          return;
        } catch (error) {
          window.clearTimeout(activeTokenTimeout);
          activeTokenController = undefined;
          activeTokenTimeout = undefined;
          lastError = error;
          livekitRoom.disconnect();
          if (livekitRoomRef.current === livekitRoom)
            livekitRoomRef.current = null;
        }
      }

      if (!cancelled) {
        setLivekitStatus("failed");
        show(
          lastError instanceof Error && lastError.name !== "AbortError"
            ? lastError.message
            : "Koneksi audio LiveKit gagal. Tekan Reconnect Audio untuk mencoba lagi.",
          "error",
        );
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(reconnectTimer);
      window.clearTimeout(activeTokenTimeout);
      activeTokenController?.abort();
      livekitRoomRef.current?.disconnect();
      livekitRoomRef.current = null;
      clearAudioElements();
    };
    // LiveKit identity only changes when the application room or signed-in participant changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id, guestMemberId, livekitReconnectKey]);
  useEffect(() => {
    if (!id) return;
    const events = new EventSource(roomEventsUrl(id));
    events.onopen = () => setRealtimeConnected(true);
    let hideTimer: number | undefined;
    events.addEventListener("cue", (event) => {
      const activity = JSON.parse((event as MessageEvent).data) as ActivityLog;
      const targetRole = activity.target.startsWith("Role: ")
        ? activity.target.slice(6)
        : "";
      if (targetRole && targetRole !== viewerRole) return;
      setActiveCue(activity.message.toUpperCase());
      setCueSender({
        name: activity.sender,
        role: activity.senderRole || "Music Director",
      });
      setCueVisible(true);
      if (activity.songSection && activity.song) {
        setCurrentSong(activity.song);
        setCurrentSection(activity.songSection);
      }
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setCueVisible(false), 5000);
      if (navigator.vibrate) navigator.vibrate([180, 80, 180]);
    });
    events.addEventListener("presence", (event) => {
      const presence = JSON.parse((event as MessageEvent).data) as {
        action: "joined" | "left";
        memberId?: number | string;
        member?: TeamMember;
      };
      if (presence.action === "joined" && presence.member)
        setMembers((current) =>
          current.some((member) => member.id === presence.member?.id)
            ? current
            : [...current, presence.member!],
        );
      if (presence.action === "left" && presence.memberId != null)
        setMembers((current) =>
          current.filter(
            (member) => String(member.id) !== String(presence.memberId),
          ),
        );
    });
    events.addEventListener("speaker", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as {
        clientId: string;
      };
      setActiveSpeaker(data.clientId || "");
    });
    events.addEventListener("room-state", (event) => {
      const next = JSON.parse((event as MessageEvent).data) as WorshipRoomType;
      setSongs(next.songs || []);
      setCurrentSong(next.currentSong || null);
      setCurrentSection(
        next.currentSong?.sections.find(
          (s) => String(s.id) === String(next.currentSongSectionId),
        ) || null,
      );
    });
    events.onerror = () => {
      setRealtimeConnected(false);
      console.warn(
        "Koneksi realtime cue terputus; browser akan mencoba tersambung kembali.",
      );
    };
    return () => {
      setRealtimeConnected(false);
      window.clearTimeout(hideTimer);
      events.close();
    };
  }, [id, setMembers, viewerRole]);
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
  const sendCue = async (
    label: string,
    songSection?: SongSection,
    targetOverride?: string,
  ) => {
    const message = `${label}${repeat > 1 && ["Bridge", "Chorus", "Repeat"].includes(label) ? ` ×${repeat}` : ""}`;
    if (!room) return;
    try {
      const target = targetOverride || channel;
      const created = await endpoints.createActivity({
        roomId: room.id,
        sender: user?.name || "Music Director",
        senderRole: user?.role || "Music Director",
        message,
        target,
        received: true,
        songId: songSection ? currentSong?.id : undefined,
        songSectionId: songSection?.id,
      });
      if (songSection && currentSong) {
        await endpoints.setRoomSongState(
          room.id,
          currentSong.id,
          songSection.id,
        );
        setCurrentSection(songSection);
      }
      setActivity((current) => [created, ...current]);
      setActiveCue(message.toUpperCase());
      setCueSender({
        name: user?.name || "Music Director",
        role: user?.role || "Music Director",
      });
      setCueVisible(true);
      show(`${message} sent to ${target}`);
      window.setTimeout(() => setCueVisible(false), 5000);
    } catch (error) {
      show(
        error instanceof Error ? error.message : "Cue gagal dikirim",
        "error",
      );
    }
  };
  const leave = async () => {
    livekitRoomRef.current?.disconnect();
    livekitRoomRef.current = null;
    livekitAudioElementsRef.current.forEach((element) => element.remove());
    livekitAudioElementsRef.current.clear();
    if (director && id) {
      if (talking) await endpoints.speakerLock(id, "release").catch(() => {});
      await endpoints.leaveDirectorPresence(id).catch(() => {});
    }
    if (!user) {
      if (id && joinedMember?.id) {
        try {
          await endpoints.leaveRoom(id, joinedMember.id);
        } catch (error) {
          show(
            error instanceof Error
              ? error.message
              : "Gagal memperbarui status member",
            "error",
          );
        }
      }
      sessionStorage.removeItem("sahata-joined-room");
      sessionStorage.removeItem("sahata-joined-member");
      localStorage.removeItem("sahata-room-role");
    } else if (user.role === "Member" && id) {
      try {
        await endpoints.leaveMemberPresence(id);
      } catch (error) {
        show(
          error instanceof Error
            ? error.message
            : "Gagal memperbarui status member",
          "error",
        );
      }
    }
    show("You left the room", "warning");
    nav(user ? "/dashboard" : "/", { replace: true });
  };
  const enableIncomingAudio = () => {
    const livekitRoom = livekitRoomRef.current;
    if (!livekitRoom) return;
    void livekitRoom
      .startAudio()
      .then(() => {
        setAudioBlocked(false);
        show("Audio enabled");
      })
      .catch(() => {
        setAudioBlocked(true);
        show("Browser masih memblokir audio", "warning");
      });
  };
  const reconnectLiveKit = () => setLivekitReconnectKey((key) => key + 1);
  if (!room) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6 dark:bg-ink">
        <div className="text-center">
          <RefreshCw
            className="mx-auto mb-4 animate-spin text-brand-500"
            size={32}
          />
          <p className="font-semibold">Memuat worship room...</p>
          <p className="mt-1 text-sm muted">
            Mengambil data terbaru dari server.
          </p>
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
          {user && user.role !== "Member" && (
            <button
              className="btn-secondary hidden text-red-500 sm:inline-flex"
              onClick={leave}
            >
              <LogOut size={17} /> Leave
            </button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-3 py-4 pb-28 sm:px-5 md:pb-8">
        {(livekitStatus !== "connected" || audioBlocked || incomingAudio) && (
          <div
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-500/40 bg-brand-500/10 p-3"
            aria-live="polite"
          >
            <span className="text-sm font-medium">
              {livekitStatus === "connecting"
                ? `Connecting LiveKit${livekitAttempt > 1 ? ` (attempt ${livekitAttempt}/${liveKitRetryDelays.length})` : ""}...`
                : livekitStatus === "reconnecting"
                  ? "LiveKit reconnecting..."
                  : livekitStatus === "failed"
                    ? "Audio connection failed"
                    : livekitStatus === "disconnected"
                      ? "Audio disconnected"
                      : incomingAudio
                        ? "Director audio ready"
                        : "LiveKit connected"}
            </span>
            <div className="flex gap-2">
              {livekitStatus === "connected" && audioBlocked && (
                <button
                  type="button"
                  className="btn-primary !min-h-9 text-sm"
                  onClick={enableIncomingAudio}
                >
                  <Headphones size={16} /> Enable Audio
                </button>
              )}
              {(livekitStatus === "failed" ||
                livekitStatus === "disconnected") && (
                <button
                  type="button"
                  className="btn-primary !min-h-9 text-sm"
                  onClick={reconnectLiveKit}
                >
                  <RefreshCw size={16} /> Reconnect Audio
                </button>
              )}
            </div>
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusBadge status="Live" />
            {user && (
              <span className="flex items-center gap-1 text-sm muted">
                <Users size={16} />
                {
                  state.members.filter((m) => m.status !== "disconnected")
                    .length
                }
                /{state.members.length} connected
              </span>
            )}
          </div>
          {user && user.role !== "Member" && (
            <label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm dark:bg-panel">
              <span className="muted">Demo view</span>
              <ModernSelect
                className="w-44"
                options={[
                  { value: "director", label: "Music Director" },
                  { value: "member", label: "Member" },
                ]}
                value={director ? "director" : "member"}
                onValueChange={(value) => setDirector(value === "director")}
              />
            </label>
          )}
        </div>
        {director ? (
          <DirectorView
            channels={channels}
            cues={cues}
            talking={talking}
            seconds={seconds}
            onTalk={(value) => {
              void (async () => {
                if (!id) return;
                if (value) {
                  const accessError = microphoneAccessError();
                  if (accessError) {
                    show(accessError, "warning");
                    return;
                  }
                }
                const livekitRoom = livekitRoomRef.current;
                if (
                  !livekitRoom ||
                  livekitRoom.state !== ConnectionState.Connected
                ) {
                  show(
                    "LiveKit belum terhubung. Tunggu sebentar lalu coba lagi.",
                    "warning",
                  );
                  return;
                }

                let lockAcquired = false;
                try {
                  await endpoints.speakerLock(
                    id,
                    value ? "acquire" : "release",
                  );
                  lockAcquired = value;
                  await livekitRoom.localParticipant.setMicrophoneEnabled(
                    value,
                    {
                      echoCancellation: true,
                      noiseSuppression: true,
                      autoGainControl: true,
                    },
                  );
                  if (!value) setSeconds(0);
                  setTalking(value);
                } catch (error) {
                  if (lockAcquired)
                    await endpoints.speakerLock(id, "release").catch(() => {});
                  setTalking(false);
                  show(microphonePublishError(error), "warning");
                }
              })();
            }}
            channel={channel}
            setChannel={setChannel}
            activeCue={activeCue}
            cueVisible={cueVisible}
            sendCue={sendCue}
            repeat={repeat}
            setRepeat={setRepeat}
            activeSpeaker={activeSpeaker}
            microphoneReady={microphoneReady}
            livekitConnected={livekitStatus === "connected"}
            songs={songs}
            currentSong={currentSong}
            currentSection={currentSection}
            onSongChange={async (songId) => {
              const song =
                songs.find((item) => String(item.id) === String(songId)) ||
                null;
              setCurrentSong(song);
              setCurrentSection(null);
              if (room)
                await endpoints
                  .setRoomSongState(room.id, song?.id)
                  .catch((error) =>
                    show(
                      error instanceof Error
                        ? error.message
                        : "Failed to select song",
                      "error",
                    ),
                  );
            }}
          />
        ) : (
          <MemberView
            activeCue={activeCue}
            cueVisible={cueVisible}
            cueSender={cueSender}
            role={joinedMember?.role || "Member"}
            channel={joinedMember?.channel || "All Team"}
            guest={!user || user.role === "Member"}
            currentSong={currentSong}
            currentSection={currentSection}
            realtimeConnected={realtimeConnected}
            allowViewSwitch={user?.role === "Member"}
            viewMode={memberViewMode}
            onViewModeChange={(value) =>
              setMemberViewMode(value as "Band" | "Singers")
            }
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
  sendCue: (v: string, section?: SongSection, targetOverride?: string) => void;
  repeat: number;
  setRepeat: (v: number) => void;
  activeSpeaker: string;
  microphoneReady: boolean;
  livekitConnected: boolean;
  songs: Song[];
  currentSong: Song | null;
  currentSection: SongSection | null;
  onSongChange: (songId: string) => void;
};
function DirectorView(p: DirectorProps) {
  const { state } = useRoom();
  const { show } = useToast();
  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <section className="space-y-5 xl:col-span-8">
        {p.activeSpeaker && (
          <div className="surface border-brand-500 p-3 text-sm font-semibold text-brand-500">
            Active speaker: {p.activeSpeaker === "" ? "None" : p.activeSpeaker}
          </div>
        )}
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
                  {
                    label: p.microphoneReady
                      ? "Microphone ready"
                      : "HTTPS required for microphone",
                    ready: p.microphoneReady,
                  },
                  {
                    label: p.livekitConnected
                      ? "LiveKit connected"
                      : "LiveKit connecting",
                    ready: p.livekitConnected,
                  },
                  { label: "Noise suppression on", ready: p.microphoneReady },
                  { label: "Low latency mode", ready: true },
                ].map((item) => (
                  <span
                    key={item.label}
                    className={`flex items-center gap-1.5 ${item.ready ? "" : "text-amber-500"}`}
                  >
                    <Check
                      size={14}
                      className={
                        item.ready ? "text-emerald-500" : "text-amber-500"
                      }
                    />
                    {item.label}
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
              <ModernSelect
                className="w-20"
                options={["1", "2", "3", "4"].map((value) => ({ value }))}
                value={p.repeat}
                onValueChange={(value) => p.setRepeat(Number(value))}
              />
            </label>
          </div>
          <div className="mt-4 grid max-w-2xl items-end gap-3 sm:grid-cols-[1fr_auto]">
            <label>
              <span className="label">Current Song</span>
              <ModernSelect
                options={[
                  { value: "", label: "Select a song from room setlist" },
                  ...p.songs.map((song) => ({
                    value: String(song.id),
                    label: song.title,
                  })),
                ]}
                value={p.currentSong?.id ? String(p.currentSong.id) : ""}
                onValueChange={p.onSongChange}
              />
            </label>
            {p.currentSong && (
              <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 px-5 py-3 text-center">
                <span className="block text-[10px] font-semibold uppercase text-brand-500">
                  Song Key
                </span>
                <b className="text-xl">
                  {p.currentSong.selectedKey || p.currentSong.defaultKey}
                </b>
              </div>
            )}
            {!p.songs.length && (
              <p className="text-sm text-amber-500">
                No songs were added to this room.
              </p>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {p.cues.map((c) => (
              <button
                key={c.id}
                onClick={() =>
                  p.sendCue(
                    c.label,
                    p.currentSong?.sections.find(
                      (section) =>
                        section.sectionLabel.trim().toLowerCase() ===
                        c.label.trim().toLowerCase(),
                    ),
                  )
                }
                className={`min-h-16 rounded-xl border p-3 font-bold transition hover:-translate-y-0.5 active:scale-95 ${c.priority === "Emergency" ? "border-red-500/40 bg-red-500/10 text-red-500" : "bg-slate-50 hover:border-brand-500 dark:bg-slate-900"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <ModernSelect
              options={p.channels.map((value) => ({
                value,
                label: `Target: ${value}`,
              }))}
              value={p.channel}
              onValueChange={p.setChannel}
            />
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
        <CustomCue
          roles={[
            ...new Set([
              ...serviceRoles,
              ...state.members.map((member) => member.role),
            ]),
          ]}
          onSend={(message, role) =>
            p.sendCue(
              message,
              undefined,
              role === "All Roles" ? "All Roles" : `Role: ${role}`,
            )
          }
        />
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
                  <span className="text-xs muted">
                    {a.createdAt
                      ? new Date(a.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : a.time}
                  </span>
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
function CustomCue({
  onSend,
  roles,
}: {
  onSend: (message: string, role: string) => void;
  roles: string[];
}) {
  const [msg, setMsg] = useState("");
  const [role, setRole] = useState("All Roles");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (msg.trim()) {
      onSend(msg, role);
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
        <ModernSelect
          ariaLabel="Target role"
          options={["All Roles", ...roles].map((value) => ({ value }))}
          value={role}
          onValueChange={setRole}
        />
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
  currentSong,
  currentSection,
  realtimeConnected,
  allowViewSwitch,
  viewMode,
  onViewModeChange,
}: {
  activeCue: string;
  cueVisible: boolean;
  cueSender: { name: string; role: string };
  role: string;
  channel: string;
  guest: boolean;
  onLeave: () => void;
  onResponse: (s: string) => void;
  currentSong: Song | null;
  currentSection: SongSection | null;
  realtimeConnected: boolean;
  allowViewSwitch: boolean;
  viewMode: "Band" | "Singers";
  onViewModeChange: (value: string) => void;
}) {
  const [volume, setVolume] = useState(72);
  const [lyricSize, setLyricSize] = useState(32);
  const [musicianTab, setMusicianTab] = useState<"cue" | "chords">("cue");
  const [chordTranspose, setChordTranspose] = useState({
    songId: "",
    steps: 0,
  });
  const { show } = useToast();
  const effectiveRole =
    allowViewSwitch && viewMode === "Singers" ? "Singer" : role;
  const normalizedRole = effectiveRole.trim().toLowerCase();
  const isLyricsViewer =
    normalizedRole.includes("singer") ||
    normalizedRole === "worship leader" ||
    normalizedRole === "wl";
  const isMusician = [
    "keyboardist",
    "guitarist",
    "bassist",
    "drummer",
  ].includes(normalizedRole);
  const showGuestChordTab =
    guest &&
    guestChordRoles.includes(normalizedRole) &&
    Boolean(currentSong?.chordSheet?.trim());
  const localTransposeSteps =
    chordTranspose.songId === currentSong?.id ? chordTranspose.steps : 0;
  const roomKey = currentSong?.selectedKey || currentSong?.defaultKey || "C";
  const chordSteps = currentSong
    ? transposeSteps(currentSong.defaultKey, roomKey) + localTransposeSteps
    : 0;
  const displayedChordKey = transposeKey(
    roomKey,
    localTransposeSteps,
    roomKey.includes("b"),
  );
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {(isLyricsViewer
          ? ([
              ["Your role", role],
              ["Channel", channel],
            ] as const)
          : ([
              ["Connection", realtimeConnected ? "Connected" : "Reconnecting"],
              ["Your role", role],
              ["Channel", channel],
              ["Audio", "Good"],
            ] as const)
        ).map(([a, b]) => (
          <div className="surface p-4" key={a}>
            <p className="text-xs muted">{a}</p>
            {a === "Your role" && allowViewSwitch ? (
              <ModernSelect
                className="mt-2"
                ariaLabel="Member room view"
                options={["Band", "Singers"].map((value) => ({ value }))}
                value={viewMode}
                onValueChange={onViewModeChange}
              />
            ) : (
              <b className="mt-1 block text-sm">{b}</b>
            )}
          </div>
        ))}
      </div>
      {showGuestChordTab && (
        <div
          className="surface grid grid-cols-2 gap-2 p-2"
          role="tablist"
          aria-label="Musician display"
        >
          <button
            type="button"
            role="tab"
            aria-selected={musicianTab === "cue"}
            className={`btn min-h-11 ${musicianTab === "cue" ? "bg-brand-500 text-slate-950" : "hover:bg-slate-100 dark:hover:bg-slate-900"}`}
            onClick={() => setMusicianTab("cue")}
          >
            <Zap size={17} /> Cue
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={musicianTab === "chords"}
            className={`btn min-h-11 ${musicianTab === "chords" ? "bg-brand-500 text-slate-950" : "hover:bg-slate-100 dark:hover:bg-slate-900"}`}
            onClick={() => setMusicianTab("chords")}
          >
            <Music2 size={17} /> Chords
          </button>
        </div>
      )}
      {isMusician && (
        <div className="surface grid grid-cols-[1fr_auto] items-center gap-4 border-brand-500/40 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">
              Current Song
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {currentSong?.title || "Waiting for song"}
            </h2>
            <p className="text-sm muted">
              {currentSong?.artist || "The MD will select the current song"}
            </p>
          </div>
          <div className="min-w-20 rounded-xl bg-brand-500/10 p-3 text-center">
            <span className="block text-[10px] font-semibold uppercase text-brand-500">
              Key
            </span>
            <b className="text-2xl">
              {currentSong
                ? currentSong.selectedKey || currentSong.defaultKey
                : "—"}
            </b>
          </div>
        </div>
      )}
      {isLyricsViewer && cueVisible && (
        <div className="surface border-brand-500 bg-brand-500/5 px-5 py-4 text-center shadow-glow">
          <p className="text-xs font-semibold text-brand-500">
            ACTIVE CUE • {channel}
          </p>
          <h2 className="mt-1 text-2xl font-black sm:text-3xl">{activeCue}</h2>
        </div>
      )}
      {isLyricsViewer && (
        <div className="surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                Realtime Lyrics
              </p>
              <h2 className="mt-1 text-xl font-bold">
                {currentSong?.title || "Waiting for song"}
              </h2>
              <p className="text-sm muted">
                {currentSong?.artist || "The MD will select the current song"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`chip ${realtimeConnected ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}
              >
                {realtimeConnected ? "Connected" : "Reconnecting"}
              </span>
              <button
                className="btn-secondary !h-10 !w-10 !p-0"
                onClick={() => setLyricSize((x) => Math.max(20, x - 2))}
              >
                A-
              </button>
              <button
                className="btn-secondary !h-10 !w-10 !p-0"
                onClick={() => setLyricSize((x) => Math.min(56, x + 2))}
              >
                A+
              </button>
            </div>
          </div>
          <div className="min-h-[320px] p-6 text-center sm:p-10">
            <p className="mb-5 text-sm font-bold uppercase tracking-[.2em] text-brand-500">
              {currentSection?.sectionLabel || "Standby"}
            </p>
            <div
              className="whitespace-pre-line font-semibold leading-relaxed"
              style={{ fontSize: lyricSize }}
            >
              {currentSection?.lyrics ||
                "Lyrics will appear when the MD sends a song section cue."}
            </div>
          </div>
        </div>
      )}
      {showGuestChordTab && musicianTab === "chords" && (
        <section className="surface overflow-hidden" role="tabpanel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                Chord Sheet
              </p>
              <h2 className="font-bold">{currentSong?.title}</h2>
            </div>
            <div
              className="flex items-center gap-2"
              aria-label="Transpose chord controls"
            >
              <button
                type="button"
                className="btn-secondary !h-10 !w-10 !p-0 text-lg"
                aria-label="Transpose down one semitone"
                onClick={() =>
                  setChordTranspose({
                    songId: currentSong?.id || "",
                    steps: localTransposeSteps - 1,
                  })
                }
              >
                −
              </button>
              <div className="min-w-16 rounded-xl bg-brand-500/10 px-3 py-2 text-center">
                <span className="block text-[9px] font-semibold uppercase text-brand-500">
                  Key
                </span>
                <b>{displayedChordKey}</b>
              </div>
              <button
                type="button"
                className="btn-secondary !h-10 !w-10 !p-0 text-lg"
                aria-label="Transpose up one semitone"
                onClick={() =>
                  setChordTranspose({
                    songId: currentSong?.id || "",
                    steps: localTransposeSteps + 1,
                  })
                }
              >
                +
              </button>
              <button
                type="button"
                className="btn-secondary !min-h-10 text-xs"
                disabled={localTransposeSteps === 0}
                onClick={() =>
                  setChordTranspose({ songId: currentSong?.id || "", steps: 0 })
                }
              >
                Reset
              </button>
            </div>
          </div>
          <ChordSheet
            source={currentSong?.chordSheet || ""}
            steps={chordSteps}
            preferFlats={displayedChordKey.includes("b")}
          />
        </section>
      )}
      {!isLyricsViewer && (!showGuestChordTab || musicianTab === "cue") && (
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
            <p className="mt-4 muted">
              from {cueSender.name} • {cueSender.role} • just now
            </p>
            {cueVisible && (
              <p className="mt-4 text-sm text-brand-500">
                📳 Vibrating • disappears in 5s
              </p>
            )}
          </div>
        </div>
      )}
      {!guest && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        </div>
      )}
      {!guest && (
        <div className="surface p-5">
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
        </div>
      )}
      <div className={guest ? "flex justify-end" : "grid grid-cols-3 gap-3"}>
        {!guest && (
          <>
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
          </>
        )}
        <button className="btn-secondary text-red-500" onClick={onLeave}>
          <LogOut size={17} /> Leave
        </button>
      </div>
    </div>
  );
}
function ChordSheet({
  source,
  steps,
  preferFlats,
}: {
  source: string;
  steps: number;
  preferFlats: boolean;
}) {
  return (
    <div className="max-h-[70vh] min-h-[420px] overflow-auto p-5 font-mono text-base leading-relaxed sm:p-7 sm:text-lg">
      {source.split("\n").map((line, lineIndex) => {
        const parts = line.split(/(\{[^{}]+\})/g).filter(Boolean);
        let pendingChord = "";
        return (
          <div
            className="min-h-8 whitespace-pre-wrap"
            key={`${lineIndex}-${line}`}
          >
            {parts.length
              ? parts.map((part, partIndex) => {
                  const chord = part.match(/^\{([^{}]+)\}$/);
                  if (chord) {
                    pendingChord = transposeChord(chord[1], steps, preferFlats);
                    if (partIndex < parts.length - 1) return null;
                  }
                  const activeChord = pendingChord;
                  pendingChord = "";
                  return activeChord ? (
                    <span
                      className="inline-flex flex-col align-bottom"
                      key={`${partIndex}-${part}`}
                    >
                      <b className="min-h-6 select-none whitespace-pre text-brand-500">
                        {activeChord}
                      </b>
                      <span className="whitespace-pre">
                        {chord ? "\u00a0" : part || "\u00a0"}
                      </span>
                    </span>
                  ) : (
                    <span key={`${partIndex}-${part}`}>{part}</span>
                  );
                })
              : "\u00a0"}
          </div>
        );
      })}
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
