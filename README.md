# Yarn Project Visualizer

Preview a sweater in your yarn colors before you cast on. Pick a Ravelry pattern, choose a yarn weight and fiber, then either enter your own yarn and colorway or let the app suggest palettes. You get an interactive, size-accurate picture of the garment and a yardage and skein estimate. Colors are approximate.

## Setup

```bash
npm install
cp .env.example .env   # add a Ravelry read-only Basic Auth key from https://www.ravelry.com/pro/developer
npm run dev
```

Without a key the app still works: you can choose a garment shape by hand, use your own or generated colors, and get estimates. Ravelry search and yarn suggestions are turned off.

The key is used only by the dev-server proxy in `server/ravelryProxy.ts` and never reaches the browser. A production deploy needs that proxy ported to a serverless function.

## Tests

```bash
npm test
```

## Design

Mockups from the design exploration live in `design/`. The app uses the "Swatch Journal" direction (A2).
