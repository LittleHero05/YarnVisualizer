import { basicAuth, guard, proxyRavelry } from '../server/ravelry.js';

// GET /api/ravelry?p=<ravelry path + query>. Credentials come from Vercel environment variables.
export async function GET(request: Request): Promise<Response> {
  const path = new URL(request.url).searchParams.get('p');
  return guard(request.headers, 'ravelry') ?? proxyRavelry(path, basicAuth(process.env.RAVELRY_USERNAME, process.env.RAVELRY_PASSWORD));
}
