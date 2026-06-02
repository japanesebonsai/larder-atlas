# Larder Atlas

Map what is on hand. Find what unlocks dinner.

Larder Atlas is a small Next.js app powered by static Epicure ingredient data. It turns a pantry list into matched ingredients, useful next pairs, cuisine/category affinities, template explanations, and a recursive ingredient atlas.

Epicure provides the ingredient embedding space and metadata. Larder Atlas adds a practical recommendation layer on top of that data, tuned for pantry usefulness rather than pure similarity.

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Static Epicure CSV data
- Serverless `/api/recommend` route
- No paid AI dependency

## What Comes From Epicure

Epicure contributes the bundled ingredient map:

- Ingredient names and categories
- Vegetarian, vegan, cuisine, food group, and NOVA metadata
- Embedding vectors
- Atlas coordinates

Larder Atlas contributes the product layer:

- Pantry text matching
- Practical next-pair scoring
- Template explanations and recipes
- Stored recipe gallery
- Recursive visualizer
- Browser-observed app metrics

## Stored Recipe Gallery

Generated recipes can be saved to Supabase and displayed in the gallery archive.
Recipe storage is optional: the app still generates template recipes when the
database is not configured.

Create the table with:

```sql
-- supabase/recipes.sql
```

Then add these environment variables in Vercel:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

The service role key is used only in server routes. Do not expose it to browser
components. Login is intentionally not required yet; the first stored-gallery
version is a shared archive.

## Optional Recipe Images

Template recipes do not require AI. Recipe images are optional and use Cloudflare
Workers AI when configured:

```bash
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_IMAGE_MODEL=@cf/black-forest-labs/flux-1-schnell
```

If these values are not set, the app still works and the image generator returns
a disabled-state message.

## Architecture

```text
Next.js app
  UI, pantry input, ingredient lookup, graph visualizer, About section

Static Epicure data
  Bundled ingredient list, tags, embeddings, and atlas coordinates

Serverless recommendation API
  Matches pantry text, scores candidates, returns recommendations

Serverless recipe API
  Saves and lists generated template recipes through Supabase REST

Client visualizer
  Recursive graph layout, ingredient list, app metrics, selectable nodes
```

The current app makes no live model call during recommendation. Recommendation responses are generated from bundled Epicure data and local deterministic scoring.

## App Metrics

The in-app metrics measure Larder Atlas itself, not Epicure's research benchmarks:

- `Ingredients`: bundled Epicure ingredient count loaded by the app.
- `Model calls`: live model calls used for recommendation. This is currently `0`.
- `Data mode`: static bundled data.
- `Last response`: browser-observed `/api/recommend` round trip for the latest analysis.
- `Session avg`: average of the latest local analysis timings in the current browser session.
- `Fastest`: fastest local analysis timing in the current browser session.

Use these as product/runtime metrics. Do not describe them as LLM-vs-Epicure benchmark results unless a separate benchmark harness is added.

## Recommendation Approach

Larder Atlas uses Epicure ingredient embeddings as the base relationship map. It then applies a lightweight local scoring layer to rank practical next pairs.

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
- No environment variables are required for recommendations or template recipes.
- Optional Cloudflare Workers AI environment variables only enable recipe images.
- Optional Supabase environment variables enable the stored recipe gallery.

Deploy with Vercel's default Next.js settings.

Cloudflare Workers Builds are not required to host this app on Vercel. If a
Cloudflare-generated branch exists, keep Vercel focused on the normal app
branches and use Cloudflare only as the optional image-generation API provider.
