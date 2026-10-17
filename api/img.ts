import { guard, proxyImage } from '../server/ravelry.js';

// GET /api/img?u=<image url on *.ravelrycache.com>
export async function GET(request: Request): Promise<Response> {
  return guard(request.headers, 'img') ?? proxyImage(new URL(request.url).searchParams.get('u'));
}
