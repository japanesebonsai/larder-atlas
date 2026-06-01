# Larder Atlas

Map what is on hand. Find what unlocks dinner.

Larder Atlas is a small Next.js app powered by static Epicure ingredient data. It turns a pantry list into matched ingredients, useful next buys, cuisine/category affinities, template explanations, and a recursive ingredient atlas.

Epicure provides the ingredient embedding space and metadata. Larder Atlas adds a practical recommendation layer on top of that data, tuned for pantry usefulness rather than pure similarity.

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Static Epicure CSV data
- Serverless `/api/recommend` route
- No paid AI dependency

## Architecture

```text
Next.js app
  UI, pantry input, ingredient lookup, graph visualizer, About section

Static Epicure data
  Bundled ingredient list, tags, embeddings, and atlas coordinates

Serverless recommendation API
  Matches pantry text, scores candidates, returns recommendations

Client visualizer
  Recursive graph layout, ingredient list, app metrics, selectable nodes
```

The current app makes no live model call during recommendation. Recommendation responses are generated from bundled Epicure data and local deterministic scoring.

## Recommendation Approach

Larder Atlas uses Epicure ingredient embeddings as the base relationship map. It then applies a lightweight local scoring layer to rank practical next buys.

This scoring layer intentionally favors complementary ingredients, such as herbs, spices, vegetables, grains, and pantry staples, over same-category substitutes like one meat replacing another. This is a Larder Atlas product heuristic designed for pantry usefulness. It is not a claim made by the Epicure paper.

## References

- [Epicure MCP](https://github.com/KAIKAKU-AI/epicure-mcp): public read-only MCP server for Epicure.
- [Epicure paper](https://arxiv.org/abs/2605.22391): *Epicure: Navigating the Emergent Geometry of Food Ingredient Embeddings*.

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
