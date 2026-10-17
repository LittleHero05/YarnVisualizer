import { handleSubscribe } from '../server/subscribe.js';

// POST /api/subscribe  { email, website (honeypot), source }
export function POST(request: Request): Promise<Response> {
  return handleSubscribe(request);
}
