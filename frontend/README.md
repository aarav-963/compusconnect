# CampusConnect frontend

React + Vite frontend for the CampusConnect events API.

## Run locally

```bash
npm install
npm run dev
```

Vite proxies `/api/*` requests to the deployed backend. Set `VITE_API_PROXY_TARGET` only if you want to use a different backend during local development.

## Deploy to Vercel

Import this repository into Vercel and set the project root to this frontend directory. Vercel detects Vite automatically; the included `vercel.json` sets the build command to `npm run build` and the output directory to `dist`.

The Vercel rewrites forward `/api/*` to `https://compusconnect-528j.onrender.com/api/*`. This keeps browser requests same-origin, so the frontend does not depend on the deployed backend's CORS configuration. The second rewrite serves the React app for client-side routes.

No environment variables are required for the current backend. If you set `VITE_API_BASE_URL`, the browser will call that origin directly and that API must allow your Vercel domain through CORS.
