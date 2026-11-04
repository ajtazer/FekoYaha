// Environment bindings
export interface Env {
  ROOMS: DurableObjectNamespace;
  BUCKET: R2Bucket;
  KV: KVNamespace;
}

// Room metadata
export interface RoomMetadata {
  keyword: string;
  createdAt: number;
  lastActiveAt: number;
  settings: RoomSettings;
}

export interface RoomSettings {
  maxMessages: number;
  maxFileSizeMB: number;
}

// Message types
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'file' | 'system';

export interface Sender {
  nickname: string;
  color: string;
}

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  sender: Sender;
  timestamp: number;
  // File messages only: original file name and size in bytes.
  name?: string;
  size?: number;
}

// WebSocket message payloads
export interface WSMessage {
  type: 'join' | 'leave' | 'message' | 'history' | 'users' | 'error' | 'room-info' | 'ping' | 'pong';
  payload: unknown;
}

export interface JoinPayload {
  nickname: string;
  color: string;
}

// What clients send. Everything is untrusted and validated by the room.
export interface MessagePayload {
  type?: unknown;
  content?: unknown;
  name?: unknown;
  size?: unknown;
}

export interface HistoryPayload {
  messages: Message[];
}

export interface UsersPayload {
  users: Sender[];
  count: number;
}

export interface RoomInfoPayload {
  exists: boolean;
  keyword: string;
  createdAt?: number;
  messageCount?: number;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}

// Upload request/response
export interface UploadRequest {
  filename: string;
  contentType: string;
  size: number;
}

export interface UploadResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}
