export type MessageKind = 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'file' | 'system'

export interface Sender {
  nickname: string
  color: string
}

export interface Message {
  id: string
  type: MessageKind
  content: string
  sender: Sender
  timestamp: number
  name?: string
  size?: number
}

export interface RoomInfo {
  exists: boolean
  keyword: string
  createdAt?: number
  messageCount?: number
}

export interface UploadResult {
  success: boolean
  fileUrl: string
  name: string
  size: number
  kind: Exclude<MessageKind, 'text' | 'system'>
}

// Admin dashboard
export interface AdminRoom {
  keyword: string
  createdAt: number
  lastActiveAt: number
}

export interface AdminParticipant {
  nickname: string
  color: string
  firstJoinedAt: number
  lastSeenAt: number
  isOnline: boolean
  ip: string
  ua: string
  cf?: { city?: string; country?: string; region?: string; colo?: string } | null
}

export interface AdminRoomInfo {
  messages: Message[]
  participants: AdminParticipant[]
  isLocked: boolean
}
