import type { Env } from './types';
import { Room } from './room';

// Export the Room Durable Object
export { Room };

// Keyword validation: lowercase, alphanumeric + hyphen, max 32 chars
const KEYWORD_REGEX = /^[a-z0-9][a-z0-9-_]*[a-z0-9]$|^[a-z0-9]$/;

function validateKeyword(keyword: string): boolean {
  if (keyword === '__admin__') return false; // Reserved
  return KEYWORD_REGEX.test(keyword) && keyword.length <= 32;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Log all requests
    console.log(`[Worker] ${request.method} ${path}`);

    // CORS headers for API requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Serve uploaded files from R2
    if (path.startsWith('/files/')) {
      const key = path.slice(7);
      const object = await env.BUCKET.get(key);

      if (!object) {
        return new Response('File not found', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=31536000');
      headers.set('Access-Control-Allow-Origin', '*');

      return new Response(object.body, { headers });
    }

    // Admin API Routes
    if (path.startsWith('/api/admin')) {
      const auth = request.headers.get('Authorization');
      // @ts-ignore - env.ADMIN_PASSWORD is provided by user in dashboard
      if (!auth || auth !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // List all rooms from KV
      if (path === '/api/admin/rooms' && request.method === 'GET') {
        const list = await env.KV.list({ prefix: 'room:' });
        const rooms = await Promise.all(list.keys.map(async (k) => {
          const val = await env.KV.get(k.name);
          return val ? JSON.parse(val) : null;
        }));
        return new Response(JSON.stringify({ rooms: rooms.filter(Boolean) }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Administrative actions Proxy to DO
      if (path.startsWith('/api/admin/room/')) {
        const parts = path.split('/');
        const keyword = parts[4];
        if (!keyword) return new Response('Missing keyword', { status: 400 });

        const roomId = env.ROOMS.idFromName(keyword);
        const room = env.ROOMS.get(roomId);

        // Proxy the request to the Room Durable Object with /admin prefix
        const doUrl = new URL(request.url);
        doUrl.pathname = '/admin' + path.split('/room/' + keyword)[1];

        const response = await room.fetch(new Request(doUrl.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body,
        }));

        // Add CORS headers to the response
        const newResponse = new Response(response.body, response);
        Object.entries(corsHeaders).forEach(([k, v]) => newResponse.headers.set(k, v));
        return newResponse;
      }
    }

    // API routes
    if (path.startsWith('/api/room/')) {
      const parts = path.split('/');
      const keyword = parts[3];

      if (!keyword || (!validateKeyword(keyword) && keyword !== '__admin__')) {
        return new Response(JSON.stringify({ error: 'Invalid room keyword' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const roomId = env.ROOMS.idFromName(keyword);
      const room = env.ROOMS.get(roomId);

      // Room info
      if (parts[4] === 'info' && request.method === 'GET') {
        const response = await room.fetch(new Request('http://room/info'));
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Create room
      if (parts[4] === 'create' && request.method === 'POST') {
        const response = await room.fetch(new Request('http://room/create', {
          method: 'POST',
          body: JSON.stringify({ keyword }),
          headers: { 'Content-Type': 'application/json' },
        }));

        if (response.ok) {
          // Track room in KV
          await env.KV.put(`room:${keyword}`, JSON.stringify({
            keyword,
            createdAt: Date.now(),
            lastActiveAt: Date.now()
          }));
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // WebSocket connection
      if (parts[4] === 'ws') {
        if (request.headers.get('Upgrade') !== 'websocket') {
          return new Response('Expected WebSocket', { status: 426 });
        }

        const wsUrl = new URL('http://room/ws');
        wsUrl.search = url.search;

        const cf = (request as any).cf;
        const ip = request.headers.get('Cf-Pseudo-IPv4') || request.headers.get('CF-Connecting-IP') || 'unknown';

        // Pass IP and CF metadata to DO via headers
        const headers = new Headers(request.headers);
        headers.set('X-Client-IP', ip);
        if (cf) headers.set('X-Client-CF', JSON.stringify(cf));

        // Proxy the request to the Room Durable Object
        // Using a new Request with custom headers ensures metadata is passed along
        return room.fetch(new Request(wsUrl.toString(), {
          method: request.method,
          headers: headers,
        }));
      }

      // ... (rest remains same but I'll update it for completeness in one block if possible)
      // Upload request - generate signed URL for R2
      if (parts[4] === 'upload' && request.method === 'POST') {
        const body = await request.json() as { filename: string; contentType: string; size: number };

        // Validate file
        const maxSize = 20 * 1024 * 1024; // 20MB
        if (body.size > maxSize) {
          return new Response(JSON.stringify({ error: 'File too large (max 20MB)' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(body.contentType)) {
          return new Response(JSON.stringify({ error: 'Invalid file type' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        // Generate unique key
        const ext = body.filename.split('.').pop() || 'bin';
        const key = `${keyword}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const fileUrl = `/files/${key}`;

        return new Response(JSON.stringify({
          key,
          fileUrl,
          uploadUrl: `/api/room/${keyword}/upload-file`,
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Direct file upload to R2
      if (parts[4] === 'upload-file' && request.method === 'POST') {
        const formData = await request.formData();
        const fileEntry = formData.get('file');
        const keyEntry = formData.get('key');

        if (!fileEntry || typeof fileEntry === 'string' || !keyEntry || typeof keyEntry !== 'string') {
          return new Response(JSON.stringify({ error: 'Missing file or key' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        const file = fileEntry as File;
        const key = keyEntry;

        await env.BUCKET.put(key, file.stream(), {
          httpMetadata: {
            contentType: file.type,
          },
        });

        return new Response(JSON.stringify({ success: true, fileUrl: `/files/${key}` }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    return new Response('FekoYaha API is running. Point your frontend to this URL.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain', ...corsHeaders }
    });
  },
};


