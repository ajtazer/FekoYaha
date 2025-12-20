import type { Env } from './types';
import { Room } from './room';

// Export the Room Durable Object
export { Room };

// Keyword validation: lowercase, alphanumeric + hyphen, max 32 chars
const KEYWORD_REGEX = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]$/;

function validateKeyword(keyword: string): boolean {
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
      'Access-Control-Allow-Headers': 'Content-Type',
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
      headers.set('Access-Control-Allow-Origin', '*'); // Allow cross-origin images

      return new Response(object.body, { headers });
    }

    // API routes
    if (path.startsWith('/api/room/')) {
      const parts = path.split('/');
      const keyword = parts[3];

      if (!keyword || !validateKeyword(keyword)) {
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

        return room.fetch(new Request(wsUrl.toString(), {
          headers: request.headers,
        }));
      }

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


