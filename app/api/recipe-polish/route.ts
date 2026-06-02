import { NextResponse } from "next/server";

const defaultModel = "@cf/moonshotai/kimi-k2.6";
const maxRecipePolishesPerWindow = 10;
const rateLimitWindowMs = 60 * 60 * 1000;
const visitorCookieName = "larder_atlas_visitor";
const rateLimits = new Map<string, { count: number; resetAt: number }>();

type RecipePolishPayload = {
  title?: string;
  type?: string;
  cuisine?: string;
  servings?: number;
  time?: string;
  pantryUsed?: string[];
  nextBuy?: string;
  ingredients?: string[];
  instructions?: string[];
  tags?: string[];
  rationale?: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const model = process.env.CLOUDFLARE_TEXT_MODEL ?? defaultModel;

  if (!accountId || !apiToken) {
    return NextResponse.json(
      {
        error: "Recipe polishing is not configured",
        message: "Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to enable Kimi polish.",
      },
      { status: 503 },
    );
  }

  const visitorId = getOrCreateVisitorId(request);
  const rateLimit = checkRateLimit(rateLimitKey(request, visitorId));

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      {
        error: "Recipe polish limit reached",
        message: `You can polish ${maxRecipePolishesPerWindow} recipes per hour. Try again in ${rateLimit.retryAfterMinutes} minutes.`,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );

    setVisitorCookie(response, visitorId);

    return response;
  }

  try {
    const body = (await request.json()) as RecipePolishPayload;

    if (!body.title || !body.ingredients?.length || !body.instructions?.length) {
      return NextResponse.json(
        {
          error: "Recipe is incomplete",
          message: "Title, ingredients, and instructions are required.",
        },
        { status: 400 },
      );
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You polish concise home-cooking recipes. Return valid JSON only. Do not add ingredients, remove ingredients, or change the recipe logic.",
            },
            {
              role: "user",
              content: buildPrompt(body),
            },
          ],
          response_format: {
            type: "json_object",
          },
          temperature: 0.4,
          max_tokens: 900,
        }),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to polish recipe", message: await response.text() },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const text = extractText(payload);
    const polished = parsePolishedRecipe(text, body);
    const polishResponse = NextResponse.json({
      recipe: polished,
      provider: "cloudflare-workers-ai",
      model,
    });

    setVisitorCookie(polishResponse, visitorId);

    return polishResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const response = NextResponse.json(
      { error: "Unable to polish recipe", message },
      { status: 400 },
    );

    setVisitorCookie(response, visitorId);

    return response;
  }
}

function buildPrompt(recipe: RecipePolishPayload) {
  return JSON.stringify({
    task: "Polish this deterministic pantry recipe for clearer, more appealing wording.",
    constraints: [
      "Return JSON only.",
      "Keep the same ingredient list count and meaning.",
      "Do not add new ingredients.",
      "Do not change servings, time, cuisine, pantryUsed, nextBuy, tags, or type.",
      "Keep instructions to 4-6 short steps.",
      "Use practical home-cooking language.",
    ],
    outputShape: {
      title: "string",
      ingredients: ["string"],
      instructions: ["string"],
      rationale: "string",
    },
    recipe,
  });
}

function extractText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Cloudflare response was empty.");
  }

  const record = payload as Record<string, unknown>;
  const result = record.result;

  if (typeof result === "string") {
    return result;
  }

  if (result && typeof result === "object") {
    const resultRecord = result as Record<string, unknown>;

    if (
      typeof resultRecord.title === "string" &&
      Array.isArray(resultRecord.ingredients) &&
      Array.isArray(resultRecord.instructions)
    ) {
      return JSON.stringify(resultRecord);
    }

    if (typeof resultRecord.response === "string") {
      return resultRecord.response;
    }

    if (typeof resultRecord.text === "string") {
      return resultRecord.text;
    }

    if (typeof resultRecord.content === "string") {
      return resultRecord.content;
    }

    if (Array.isArray(resultRecord.content)) {
      const contentText = resultRecord.content
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          if (item && typeof item === "object") {
            const itemRecord = item as Record<string, unknown>;

            return typeof itemRecord.text === "string" ? itemRecord.text : "";
          }

          return "";
        })
        .join("")
        .trim();

      if (contentText) {
        return contentText;
      }
    }

    if (Array.isArray(resultRecord.choices)) {
      const firstChoice = resultRecord.choices[0] as Record<string, unknown> | undefined;
      const message = firstChoice?.message as Record<string, unknown> | undefined;

      if (typeof message?.content === "string") {
        return message.content;
      }

      if (typeof firstChoice?.text === "string") {
        return firstChoice.text;
      }
    }

    const nestedText = findLikelyText(resultRecord);

    if (nestedText) {
      return nestedText;
    }
  }

  throw new Error("Cloudflare response did not include text.");
}

function findLikelyText(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const textKeys = ["response", "text", "content", "output", "generated_text"];
  const record = value as Record<string, unknown>;

  for (const key of textKeys) {
    const candidate = record[key];

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  for (const candidate of Object.values(record)) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const nestedText = findLikelyText(item);

        if (nestedText) {
          return nestedText;
        }
      }
    } else if (candidate && typeof candidate === "object") {
      const nestedText = findLikelyText(candidate);

      if (nestedText) {
        return nestedText;
      }
    }
  }

  return null;
}

function parsePolishedRecipe(text: string, fallback: RecipePolishPayload) {
  const jsonText = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(jsonText) as Partial<RecipePolishPayload>;

  const ingredients =
    Array.isArray(parsed.ingredients) && parsed.ingredients.length === fallback.ingredients?.length
      ? parsed.ingredients.map(String)
      : fallback.ingredients;
  const instructions =
    Array.isArray(parsed.instructions) && parsed.instructions.length
      ? parsed.instructions.map(String).slice(0, 6)
      : fallback.instructions;

  return {
    ...fallback,
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : fallback.title,
    ingredients,
    instructions,
    rationale:
      typeof parsed.rationale === "string" && parsed.rationale.trim()
        ? parsed.rationale.trim()
        : fallback.rationale,
    source: "cloudflare-kimi",
  };
}

function getOrCreateVisitorId(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${visitorCookieName}=`));

  return cookie?.split("=")[1] || crypto.randomUUID();
}

function setVisitorCookie(response: NextResponse, visitorId: string) {
  response.cookies.set(visitorCookieName, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
}

function rateLimitKey(request: Request, visitorId: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || "unknown";

  return `${visitorId}:${ip}`;
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const existing = rateLimits.get(key);

  cleanupExpiredRateLimits(now);

  if (!existing || existing.resetAt <= now) {
    rateLimits.set(key, {
      count: 1,
      resetAt: now + rateLimitWindowMs,
    });

    return { allowed: true };
  }

  if (existing.count >= maxRecipePolishesPerWindow) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

    return {
      allowed: false,
      retryAfterSeconds,
      retryAfterMinutes: Math.ceil(retryAfterSeconds / 60),
    };
  }

  existing.count += 1;
  rateLimits.set(key, existing);

  return { allowed: true };
}

function cleanupExpiredRateLimits(now: number) {
  if (rateLimits.size < 500) {
    return;
  }

  for (const [key, value] of rateLimits.entries()) {
    if (value.resetAt <= now) {
      rateLimits.delete(key);
    }
  }
}
