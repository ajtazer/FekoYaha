import type { Env } from './types';
import { Room } from './room';
import {
  MAX_FILE_BYTES,
  cleanFileName,
  contentDisposition,
  isInlineMimeType,
  lookupFileType,
  newFileKey,
} from './files';

// Export the Room Durable Object
export { Room };

// Keyword validation: lowercase, alphanumeric only, max 32 chars
const KEYWORD_REGEX = /^[a-z0-9]{1,32}$/;

function validateKeyword(keyword: string): boolean {
  return KEYWORD_REGEX.test(keyword);
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
      headers.set('X-Content-Type-Options', 'nosniff');

      // Only media and PDFs open in the browser; everything else downloads.
      const name = object.customMetadata?.originalName || key.split('/').pop() || 'file';
      const disposition = isInlineMimeType(headers.get('Content-Type')) ? 'inline' : 'attachment';
      headers.set('Content-Disposition', contentDisposition(disposition, name));

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

      const jsonError = (error: string, status = 400) =>
        new Response(JSON.stringify({ error }), {
          status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });

      // Step 1: pre-check a file before uploading it (kept for older clients).
      if (parts[4] === 'upload' && request.method === 'POST') {
        let body: { filename?: unknown; size?: unknown };
        try {
          body = await request.json();
        } catch {
          return jsonError('Invalid request body');
        }

        const filename = typeof body.filename === 'string' ? body.filename : '';
        const size = typeof body.size === 'number' ? body.size : 0;
        if (size <= 0 || size > MAX_FILE_BYTES) {
          return jsonError('File too large (max 100MB)');
        }

        const fileType = lookupFileType(filename);
        if (!fileType) {
          return jsonError("This file type isn't supported");
        }

        // The key here is only advisory: upload-file always generates its own.
        const key = newFileKey(keyword, fileType.ext);
        return new Response(JSON.stringify({
          key,
          fileUrl: `/files/${key}`,
          uploadUrl: `/api/room/${keyword}/upload-file`,
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Step 2: the actual upload. Everything is validated here, because a
      // client can call this endpoint directly and skip step 1.
      if (parts[4] === 'upload-file' && request.method === 'POST') {
        let formData: FormData;
        try {
          formData = await request.formData();
        } catch {
          return jsonError('Invalid upload');
        }

        const fileEntry = formData.get('file');
        if (!fileEntry || typeof fileEntry === 'string') {
          return jsonError('Missing file');
        }
        const file = fileEntry as File;

        if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
          return jsonError('File too large (max 100MB)');
        }

        const fileType = lookupFileType(file.name);
        if (!fileType) {
          return jsonError("This file type isn't supported");
        }

        // Never trust a client-supplied key: it could overwrite another file.
        const key = newFileKey(keyword, fileType.ext);
        const name = cleanFileName(file.name);

        await env.BUCKET.put(key, file.stream(), {
          httpMetadata: { contentType: fileType.mime },
          customMetadata: { originalName: name },
        });

        return new Response(JSON.stringify({
          success: true,
          fileUrl: `/files/${key}`,
          name,
          size: file.size,
          kind: fileType.kind,
        }), {
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


