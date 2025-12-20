import type { Env, Message, Sender, WSMessage, RoomMetadata, MessageType } from './types';

interface ConnectedClient {
  webSocket: WebSocket;
  sender: Sender;
  joinedAt: number;
}

export class Room implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private clients: Map<WebSocket, ConnectedClient> = new Map();
  private messages: Message[] = [];
  private metadata: RoomMetadata | null = null;

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
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Log all Durable Object requests
    console.log(`[Room:${this.metadata?.keyword || 'new'}] ${request.method} ${url.pathname}`);

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

  private handleRoomInfo(): Response {
    const exists = this.metadata !== null;
    return new Response(JSON.stringify({
      exists,
      keyword: this.metadata?.keyword || '',
      createdAt: this.metadata?.createdAt,
      messageCount: this.messages.length,
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

    // Accept the WebSocket connection
    this.state.acceptWebSocket(server);

    // Get nickname and color from query params
    const nickname = url.searchParams.get('nickname') || 'Anonymous';
    const color = url.searchParams.get('color') || this.generateColor();

    const sender: Sender = { nickname, color };

    this.clients.set(server, {
      webSocket: server,
      sender,
      joinedAt: Date.now(),
    });

    // Send history to new client
    this.sendToClient(server, {
      type: 'history',
      payload: { messages: this.messages.slice(-100) }, // Last 100 messages
    });

    // Send current users list
    this.broadcastUsers();

    // Broadcast join message
    const joinMessage: Message = {
      id: crypto.randomUUID(),
      type: 'system',
      content: `${nickname} joined the room`,
      sender: { nickname: 'System', color: '#888888' },
      timestamp: Date.now(),
    };

    this.messages.push(joinMessage);
    this.saveMessages();
    this.broadcast({
      type: 'message',
      payload: joinMessage,
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) return;

    try {
      const data = JSON.parse(message as string) as WSMessage;
      console.log(`[Room:${this.metadata?.keyword}] WS message from ${client.sender.nickname}: ${data.type}`);

      switch (data.type) {
        case 'message':
          await this.handleMessage(client, data.payload as { type: MessageType; content: string });
          break;
      }
    } catch (error) {
      console.error(`[Room] WebSocket message parse error:`, error);
      this.sendToClient(ws, {
        type: 'error',
        payload: { message: 'Invalid message format' },
      });
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    const client = this.clients.get(ws);
    if (client) {
      // Broadcast leave message
      const leaveMessage: Message = {
        id: crypto.randomUUID(),
        type: 'system',
        content: `${client.sender.nickname} left the room`,
        sender: { nickname: 'System', color: '#888888' },
        timestamp: Date.now(),
      };

      this.messages.push(leaveMessage);
      this.saveMessages();

      this.clients.delete(ws);

      this.broadcast({
        type: 'message',
        payload: leaveMessage,
      });

      this.broadcastUsers();
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    const client = this.clients.get(ws);
    if (client) {
      this.clients.delete(ws);
      this.broadcastUsers();
    }
  }

  private async handleMessage(client: ConnectedClient, payload: { type: MessageType; content: string }): Promise<void> {
    // Validate content
    if (!payload.content || payload.content.trim().length === 0) {
      return;
    }

    // Rate limiting check could go here

    const message: Message = {
      id: crypto.randomUUID(),
      type: payload.type || 'text',
      content: payload.content.trim(),
      sender: client.sender,
      timestamp: Date.now(),
    };

    this.messages.push(message);

    // Trim old messages if over limit
    if (this.metadata && this.messages.length > this.metadata.settings.maxMessages) {
      this.messages = this.messages.slice(-this.metadata.settings.maxMessages);
    }

    await this.saveMessages();

    // Update last active time
    if (this.metadata) {
      this.metadata.lastActiveAt = Date.now();
      await this.state.storage.put('metadata', this.metadata);
    }

    // Broadcast to all clients
    this.broadcast({
      type: 'message',
      payload: message,
    });
  }

  private async saveMessages(): Promise<void> {
    await this.state.storage.put('messages', this.messages);
  }

  private broadcast(message: WSMessage): void {
    const data = JSON.stringify(message);
    for (const [ws] of this.clients) {
      try {
        ws.send(data);
      } catch (error) {
        // Client disconnected, will be cleaned up
      }
    }
  }

  private broadcastUsers(): void {
    const users = Array.from(this.clients.values()).map(c => c.sender);
    this.broadcast({
      type: 'users',
      payload: { users, count: users.length },
    });
  }

  private sendToClient(ws: WebSocket, message: WSMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      // Client disconnected
    }
  }

  private generateColor(): string {
    const colors = [
      '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
      '#2196F3', '#00BCD4', '#009688', '#4CAF50',
      '#FF9800', '#FF5722', '#795548', '#607D8B',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
