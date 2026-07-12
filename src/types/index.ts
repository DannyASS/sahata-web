export type Status =
  "connected" | "weak" | "disconnected" | "muted" | "listening";
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "pending" | "active" | "rejected";
  avatar?: string;
  createdAt?: string;
}
export interface WorshipRoom {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  code: string;
  members: number;
  channels: string[];
  status: "Scheduled" | "Live" | "Completed";
}
export interface TeamMember {
  id: string;
  userId?: string;
  name: string;
  role: string;
  channel: string;
  status: Status;
  headset: boolean;
  battery: number;
  lastActive: string;
}
export interface Channel {
  id: string;
  name: string;
}
export interface Cue {
  id: string;
  label: string;
  category: string;
  priority: "Normal" | "High" | "Emergency";
  channel: string;
  icon?: string;
  vibration?: string;
}
export interface ActivityLog {
  id: string;
  roomId?: string;
  sender: string;
  senderRole?: string;
  message: string;
  target: string;
  received: boolean;
  createdAt?: string;
  time?: string;
}
export interface ApiSettings {
  userId: string;
  theme: "dark" | "light";
  language: string;
  notifications: boolean;
  vibration: boolean;
  audioDevice: string;
  micSensitivity: number;
  cueVolume: number;
}
export interface DeviceStatus {
  name: string;
  status: "Excellent" | "Good" | "Warning" | "Failed" | "Not tested";
  detail: string;
}
export interface ServiceSchedule {
  name: string;
  date: string;
  time: string;
  members: number;
  status: string;
}
