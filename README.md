# Larder Atlas

Map what is on hand. Find what unlocks dinner.

Larder Atlas is a small Next.js app powered by static Epicure ingredient data. It turns a pantry list into matched ingredients, useful next buys, cuisine/category affinities, template explanations, and a focused ingredient atlas preview.

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Static Epicure CSV data
- Serverless `/api/recommend` route
- No paid AI dependency

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm.cmd run dev
```

On Windows PowerShell, `npm.cmd` avoids execution-policy issues with `npm.ps1`.

Open:

```text
http://localhost:3000
```

If Next reports another dev server is already running, stop the PID it prints:

```bash
taskkill /PID <PID_FROM_ERROR> /F
```

Then run the dev server again.

## Verification

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## API Smoke Test

With the dev server running:

```powershell
$body = @{ pantry = 'rice, egg, cabbage, soy sauce'; goal = 'japanese'; limit = 3 } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/api/recommend -Method Post -ContentType 'application/json' -Body $body
```

The response should include matched ingredients, recommendations, cuisine/category affinity, atlas coordinates, and a template explanation.

## Vercel Deployment

This app is Vercel-friendly as-is:

- The Epicure data is bundled in `data/epicure`.
- The recommendation engine runs in a Next.js serverless route.
- The browser response strips full embedding vectors.
- No environment variables are required for the current no-AI version.

Deploy with Vercel's default Next.js settings.
