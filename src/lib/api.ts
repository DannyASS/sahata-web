const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1").replace(/\/$/, "");
export const roomEventsUrl = (roomId: string) => `${API_URL}/rooms/${encodeURIComponent(roomId)}/events`;
export type RoomSignal = { clientId: string; targetId: string; type: "offer" | "answer" | "ice"; data: RTCSessionDescriptionInit | RTCIceCandidateInit };

type Envelope<T> = { data: T };

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("sahata-token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) window.dispatchEvent(new Event("sahata:unauthorized"));
    throw new ApiError(body.error || "Tidak dapat terhubung ke server", response.status);
  }
  return (body as Envelope<T>).data;
}

export const endpoints = {
  register: (input: { name: string; email: string; password: string }) => api<{ user: import("../types").User; message: string }>("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  users: () => api<import("../types").User[]>("/users"),
  updateUserAccess: (id: string, role: string, status: import("../types").User["status"]) => api<import("../types").User>(`/users/${id}`, { method: "PUT", body: JSON.stringify({ role, status }) }),
  signal: (roomId: string, signal: RoomSignal) => api(`/rooms/${encodeURIComponent(roomId)}/signals`, { method: "POST", body: JSON.stringify(signal) }),
  leaveRoom: (roomId: string, memberId: string) => api(`/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(memberId)}`, { method: "DELETE" }),
  enterMemberPresence: (roomId: string, channel = "All Team") => api<import("../types").TeamMember>(`/rooms/${encodeURIComponent(roomId)}/presence`, { method: "POST", body: JSON.stringify({ channel, headset: true }) }),
  leaveMemberPresence: (roomId: string) => api(`/rooms/${encodeURIComponent(roomId)}/presence`, { method: "DELETE" }),
  enterDirectorPresence: (roomId: string) => api<{ clientId: string; directors: { clientId: string; name: string; role: string }[] }>(`/rooms/${encodeURIComponent(roomId)}/director-presence`, { method: "POST", body: "{}" }),
  leaveDirectorPresence: (roomId: string) => api(`/rooms/${encodeURIComponent(roomId)}/director-presence`, { method: "DELETE" }),
  speakerLock: (roomId: string, action: "acquire" | "release") => api<{ granted: boolean; clientId: string }>(`/rooms/${encodeURIComponent(roomId)}/speaker-lock`, { method: "POST", body: JSON.stringify({ action }) }),
  directors: (roomId: string) => api<{ clientId: string; name: string; role: string }[]>(`/rooms/${encodeURIComponent(roomId)}/directors`),
  join: (input: { code: string; name: string; role: string; channel: string; headset: boolean }) => api<{ room: import("../types").WorshipRoom; member: import("../types").TeamMember }>("/join", { method: "POST", body: JSON.stringify(input) }),
  login: (email: string, password: string) => api<{ user: import("../types").User; token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  rooms: () => api<import("../types").WorshipRoom[]>("/rooms"),
  createRoom: (room: Omit<import("../types").WorshipRoom, "id" | "members">) => api<import("../types").WorshipRoom>("/rooms", { method: "POST", body: JSON.stringify(room) }),
  updateRoom: (room: import("../types").WorshipRoom) => api<import("../types").WorshipRoom>(`/rooms/${room.id}`, { method: "PUT", body: JSON.stringify(room) }),
  deleteRoom: (id: string) => api(`/rooms/${id}`, { method: "DELETE" }),
  members: (roomId: string) => api<import("../types").TeamMember[]>(`/members?roomId=${encodeURIComponent(roomId)}`),
  createMember: (member: Omit<import("../types").TeamMember, "id"> & { roomId: string }) => api<import("../types").TeamMember>("/members", { method: "POST", body: JSON.stringify(member) }),
  updateMember: (member: import("../types").TeamMember & { roomId: string }) => api<import("../types").TeamMember>(`/members/${member.id}`, { method: "PUT", body: JSON.stringify(member) }),
  deleteMember: (id: string) => api(`/members/${id}`, { method: "DELETE" }),
  cues: () => api<import("../types").Cue[]>("/cues"),
  createCue: (cue: Omit<import("../types").Cue, "id"> & { sortOrder: number }) => api<import("../types").Cue>("/cues", { method: "POST", body: JSON.stringify(cue) }),
  updateCue: (cue: import("../types").Cue & { sortOrder: number }) => api<import("../types").Cue>(`/cues/${cue.id}`, { method: "PUT", body: JSON.stringify(cue) }),
  deleteCue: (id: string) => api(`/cues/${id}`, { method: "DELETE" }),
  activities: (roomId: string) => api<import("../types").ActivityLog[]>(`/activities?roomId=${encodeURIComponent(roomId)}`),
  createActivity: (activity: Omit<import("../types").ActivityLog, "id" | "createdAt"> & { roomId: string }) => api<import("../types").ActivityLog>("/activities", { method: "POST", body: JSON.stringify(activity) }),
  settings: () => api<import("../types").ApiSettings>("/settings"),
  saveSettings: (settings: import("../types").ApiSettings) => api<import("../types").ApiSettings>("/settings", { method: "PUT", body: JSON.stringify(settings) }),
};
