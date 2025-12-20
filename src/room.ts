import type { Env, Message, Sender, WSMessage, RoomMetadata, MessageType } from './types';

interface ConnectedClient {
  nickname: string;
  color: string;
  joinedAt: number;
  ip: string;
  ua: string;
  cf: any;
}

export class Room implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private messages: Message[] = [];
  private metadata: RoomMetadata | null = null;
  private isLocked: boolean = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Load persisted data on initialization
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<Message[]>('messages');
      if (stored) {
        this.messages = stored;
      }

      const meta = await this.state.storage.get<RoomMetadata>('metadata');
      if (meta) {
        this.metadata = meta;
      }

      const locked = await this.state.storage.get<boolean>('isLocked');
      if (locked !== undefined) {
        this.isLocked = locked;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Self-healing: Ensure room is tracked in KV
    if (this.metadata) {
      this.state.waitUntil(this.env.KV.put(`room:${this.metadata.keyword}`, JSON.stringify({
        keyword: this.metadata.keyword,
        createdAt: this.metadata.createdAt,
        lastActiveAt: Date.now()
      })));
    }

    // Log all Durable Object requests
    console.log(`[Room:${this.metadata?.keyword || 'new'}] ${request.method} ${url.pathname}`);

    // Admin commands
    if (url.pathname.startsWith('/admin/')) {
      return this.handleAdminRequest(request, url);
    }

    // Handle room info request
    if (url.pathname === '/info') {
      console.log(`[Room] Info requested - exists: ${this.metadata !== null}`);
      return this.handleRoomInfo();
    }

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      console.log(`[Room] WebSocket connection requested`);
      return this.handleWebSocket(request, url);
    }

    // Handle room creation
    if (request.method === 'POST' && url.pathname === '/create') {
      console.log(`[Room] Room creation requested`);
      return this.handleCreate(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleAdminRequest(request: Request, url: URL): Promise<Response> {
    const action = url.pathname.slice(7); // After "/admin/"

    switch (action) {
      case 'info':
        const participants = this.state.getWebSockets().map(ws => {
          const meta = ws.deserializeAttachment() as ConnectedClient;
          return meta ? {
            nickname: meta.nickname,
            joinedAt: meta.joinedAt,
            ip: meta.ip,
            ua: meta.ua,
            cf: meta.cf
          } : null;
        }).filter(Boolean);

        return new Response(JSON.stringify({
          metadata: this.metadata,
          messages: this.messages,
          isLocked: this.isLocked,
          participants: participants
        }), { headers: { 'Content-Type': 'application/json' } });

      case 'clear':
        this.messages = [];
        await this.state.storage.put('messages', []);
        this.broadcast({ type: 'history', payload: { messages: [] } });
        return new Response(JSON.stringify({ success: true }));

      case 'lock':
        this.isLocked = !this.isLocked;
        await this.state.storage.put('isLocked', this.isLocked);
        this.broadcast({
          type: 'message',
          payload: {
            id: crypto.randomUUID(),
            type: 'system',
            content: `Room has been ${this.isLocked ? 'locked (read-only)' : 'unlocked'} by admin`,
            sender: { nickname: 'System', color: '#888888' },
            timestamp: Date.now()
          }
        });
        return new Response(JSON.stringify({ success: true, isLocked: this.isLocked }));

      case 'delete':
        if (this.metadata) {
          await this.env.KV.delete(`room:${this.metadata.keyword}`);
        }
        await this.state.storage.deleteAll();
        this.broadcast({
          type: 'error',
          payload: { message: 'This room has been deleted by an administrator.' }
        });
        // Disconnect everyone
        this.state.getWebSockets().forEach(ws => ws.close(1000, "Room deleted"));
        this.messages = [];
        this.metadata = null;
        return new Response(JSON.stringify({ success: true }));

      default:
        return new Response('Unknown admin action', { status: 400 });
    }
  }

  private handleRoomInfo(): Response {
    const exists = this.metadata !== null;
    return new Response(JSON.stringify({
      exists,
      keyword: this.metadata?.keyword || '',
      createdAt: this.metadata?.createdAt,
      messageCount: this.messages.length,
      isLocked: this.isLocked,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleCreate(request: Request): Promise<Response> {
    if (this.metadata) {
      return new Response(JSON.stringify({ error: 'Room already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json() as { keyword: string };
    const now = Date.now();

    this.metadata = {
      keyword: body.keyword,
      createdAt: now,
      lastActiveAt: now,
      settings: {
        maxMessages: 1000,
        maxFileSizeMB: 20,
      },
    };

    await this.state.storage.put('metadata', this.metadata);

    // Add system message
    const systemMessage: Message = {
      id: crypto.randomUUID(),
      type: 'system',
      content: `Room "${body.keyword}" created`,
      sender: { nickname: 'System', color: '#888888' },
      timestamp: now,
    };

    this.messages.push(systemMessage);
    await this.saveMessages();

    return new Response(JSON.stringify({ success: true, metadata: this.metadata }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private handleWebSocket(request: Request, url: URL): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Get metadata
    const nickname = url.searchParams.get('nickname') || 'Anonymous';
    const color = url.searchParams.get('color') || this.generateColor();
    const ip = request.headers.get('X-Client-IP') || 'unknown';
    const ua = request.headers.get('User-Agent') || 'unknown';
    const cfRaw = request.headers.get('X-Client-CF');
    const cf = cfRaw ? JSON.parse(cfRaw) : null;

    const meta: ConnectedClient = {
      nickname,
      color,
      joinedAt: Date.now(),
      ip,
      ua,
      cf
    };

    // Store metadata on the server-side socket
    this.state.acceptWebSocket(server);
    server.serializeAttachment(meta);

    // Initial signals
    this.sendToClient(server, {
      type: 'history',
      payload: { messages: this.messages.slice(-300) },
    });

    this.broadcastJoin(nickname, color);

    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcastJoin(nickname: string, color: string) {
    const joinMessage: Message = {
      id: crypto.randomUUID(),
      type: 'system',
      content: `${nickname} joined the room`,
      sender: { nickname: 'System', color: '#888888' },
      timestamp: Date.now(),
    };

    this.messages.push(joinMessage);
    this.saveMessages();
    this.broadcast({ type: 'message', payload: joinMessage });
    this.broadcastUsers();
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const meta = ws.deserializeAttachment() as ConnectedClient;
    if (!meta) return;

    try {
      const data = JSON.parse(message as string) as WSMessage;
      console.log(`[Room:${this.metadata?.keyword}] WS from ${meta.nickname}: ${data.type}`);

      switch (data.type) {
        case 'ping':
          this.sendToClient(ws, { type: 'pong' } as any);
          break;
        case 'message':
          await this.handleMessage(ws, meta, data.payload as { type: MessageType; content: string });
          break;
      }
    } catch (error) {
      console.error(`[Room] WS parse error:`, error);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    const meta = ws.deserializeAttachment() as ConnectedClient;
    if (meta) {
      const leaveMessage: Message = {
        id: crypto.randomUUID(),
        type: 'system',
        content: `${meta.nickname} left the room`,
        sender: { nickname: 'System', color: '#888888' },
        timestamp: Date.now(),
      };

      this.messages.push(leaveMessage);
      this.saveMessages();
      this.broadcast({ type: 'message', payload: leaveMessage });
      this.broadcastUsers();
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    this.broadcastUsers();
  }

  private async handleMessage(ws: WebSocket, meta: ConnectedClient, payload: { type: MessageType; content: string }): Promise<void> {
    if (this.isLocked) {
      this.sendToClient(ws, {
        type: 'error',
        payload: { message: 'Room is read-only.' }
      });
      return;
    }

    if (!payload.content || payload.content.trim().length === 0) return;

    const message: Message = {
      id: crypto.randomUUID(),
      type: payload.type || 'text',
      content: payload.content.trim(),
      sender: { nickname: meta.nickname, color: meta.color },
      timestamp: Date.now(),
    };

    this.messages.push(message);

    if (this.metadata && this.messages.length > this.metadata.settings.maxMessages) {
      this.messages = this.messages.slice(-this.metadata.settings.maxMessages);
    }

    await this.saveMessages();

    if (this.metadata) {
      this.metadata.lastActiveAt = Date.now();
      await this.state.storage.put('metadata', this.metadata);

      this.env.KV.get(`room:${this.metadata.keyword}`).then(val => {
        if (val) {
          const data = JSON.parse(val);
          data.lastActiveAt = Date.now();
          return this.env.KV.put(`room:${this.metadata!.keyword}`, JSON.stringify(data));
        }
      });
    }

    this.broadcast({ type: 'message', payload: message });
  }

  private async saveMessages(): Promise<void> {
    await this.state.storage.put('messages', this.messages);
  }

  private broadcast(message: WSMessage): void {
    const data = JSON.stringify(message);
    this.state.getWebSockets().forEach(ws => {
      try { ws.send(data); } catch (e) { }
    });
  }

  private broadcastUsers(): void {
    const users = this.state.getWebSockets().map(ws => {
      const meta = ws.deserializeAttachment() as ConnectedClient;
      return meta ? { nickname: meta.nickname, color: meta.color } : null;
    }).filter(Boolean);

    this.broadcast({
      type: 'users',
      payload: { users, count: users.length },
    });
  }

  private sendToClient(ws: WebSocket, message: WSMessage): void {
    try { ws.send(JSON.stringify(message)); } catch (e) { }
  }

  private generateColor(): string {
    const colors = ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#00BCD4', '#009688', '#4CAF50', '#FF9800', '#FF5722', '#795548', '#607D8B'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
