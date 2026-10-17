import { basicAuth, proxyRavelry } from '../server/ravelry.js';

// GET /api/ravelry?p=<ravelry path + query>. Credentials come from Vercel environment variables.
export function GET(request: Request): Promise<Response> {
  const path = new URL(request.url).searchParams.get('p');
  return proxyRavelry(path, basicAuth(process.env.RAVELRY_USERNAME, process.env.RAVELRY_PASSWORD));
}
