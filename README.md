# Yarn Project Visualizer

Preview a sweater in your yarn colors before you cast on. Pick a Ravelry pattern, choose a yarn weight and fiber, then either enter your own yarn and colorway or let the app suggest palettes. You get an interactive, size-accurate picture of the garment and a yardage and skein estimate. Colors are approximate.

## Setup

```bash
npm install
cp .env.example .env   # add a Ravelry read-only Basic Auth key from https://www.ravelry.com/pro/developer
npm run dev
```

Without a key the app still works: you can choose a garment shape by hand, use your own or generated colors, and get estimates. Ravelry search and yarn suggestions are turned off.

The key never reaches the browser. Ravelry calls go through `/api/ravelry` and `/api/img`. Both use the shared logic in `server/ravelry.ts`, which only allows the read endpoints the app needs and sets CDN cache headers.

- **Locally:** the Vite dev server serves those routes (`server/ravelryProxy.ts`).
- **On Vercel:** the serverless functions in `api/` serve them.

## Deploy (Vercel)

1. Import the GitHub repo at vercel.com/new. The Vite preset and `vercel.json` handle the build settings.
2. Add the environment variables `RAVELRY_USERNAME` and `RAVELRY_PASSWORD` under Project → Settings → Environment Variables.
3. Deploy, or redeploy if the variables were added after the first deploy.

## Tests

```bash
npm test
```

## Design

Mockups from the design exploration live in `design/`. The app uses the "Swatch Journal" direction (A2).
