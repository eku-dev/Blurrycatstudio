# Blurrycat Studio — Homepage

Homepage for Blurrycat Studio, an independent creative technology studio (Lucknow, India).

Built with React, Vite, TypeScript, Tailwind CSS v4, Framer Motion, Lenis and three.js.

## Run

```bash
npm install
npm run dev     # development server
npm start       # production build + preview on http://localhost:4173
```

Use `npm start` to judge performance — the dev server serves unbundled modules.

## Structure

- `src/components/` — page sections (Hero, Process, WorkArc, Services, Journal, Closing) and overlays
- `src/fx/motionPhoto.ts` — WebGL motion-blur effect for the hero photograph
- `src/three/arcScene.ts` — three.js image wheel for "Selected work" (lazy-loaded)
- `src/lib/` — data, image helpers, smooth scrolling + section snapping

## Placeholders to replace

- Contact email `hello@blurrycatstudio.com` and social links (`src/lib/data.ts`, `src/components/Closing.tsx`)
- Unsplash stock imagery (`src/lib/images.ts`)
- Vapi and OpenAI logos use monogram tiles (`src/components/VoiceFlow.tsx`)
