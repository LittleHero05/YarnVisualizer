import { proxyImage } from '../server/ravelry.js';

// GET /api/img?u=<image url on *.ravelrycache.com>
export function GET(request: Request): Promise<Response> {
  return proxyImage(new URL(request.url).searchParams.get('u'));
}
