# RevAssist — app

The React + Vite frontend for RevAssist. See the [project README](../README.md) for what this is and why.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Scripts

| Command         | What it does                                  |
| --------------- | --------------------------------------------- |
| `npm run dev`   | Start the Vite dev server with HMR.           |
| `npm run build` | Build a production bundle.                   |
| `npm run test`  | Run the Vitest unit test suite.              |
| `npm run test:watch` | Run Vitest in watch mode.              |
| `npm run preview` | Serve the production build locally.        |
| `npm run lint`  | Lint the source with ESLint.                  |

## Stack

- React 19 with hooks
- Vite 8 (React plugin)
- Tailwind CSS v4 via the `@tailwindcss/vite` plugin
- Lucide icons
- Vitest for product-logic coverage

## Mock mode

This build runs entirely in the browser — the streaming response is simulated client-side so the demo works without an API key. Sample deals, response selection, schema validation, partial parsing, and copy/export formatting live in [src/lib/dealEngine.js](src/lib/dealEngine.js). To wire it to a real LLM, replace `getMockDealResponse(input)` in [src/App.jsx](src/App.jsx) with a `fetch` to your backend that streams `text/event-stream` chunks; the partial-JSON parser already handles incremental tokens.
