import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";

const defaultModel = "@cf/black-forest-labs/flux-1-schnell";
const visitorCookieName = "larder_atlas_visitor";
const rateLimitWindowMs = 60 * 60 * 1000;
const maxImagesPerWindow = 5;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const model = process.env.CLOUDFLARE_IMAGE_MODEL ?? defaultModel;

  if (!accountId || !apiToken) {
    return NextResponse.json(
      {
        error: "Image generation is not configured",
        message: "Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to enable it.",
      },
      { status: 503 },
    );
  }

  const visitorId = getOrCreateVisitorId(request);
  const rateLimit = checkRateLimit(rateLimitKey(request, visitorId));

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      {
        error: "Image generation limit reached",
        message: `You can generate ${maxImagesPerWindow} recipe images per hour. Try again in ${rateLimit.retryAfterMinutes} minutes.`,
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
    const body = await request.json();
    const prompt = buildPrompt(body);
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      },
    );

    if (!response.ok) {
      const message = await response.text();

      return NextResponse.json(
        { error: "Unable to generate recipe image", message },
        { status: response.status },
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.startsWith("image/")) {
      const bytes = await response.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");

      const imageResponse = NextResponse.json({
        image: `data:${contentType};base64,${base64}`,
        prompt,
        provider: "cloudflare-workers-ai",
        model,
      });

      setVisitorCookie(imageResponse, visitorId);

      return imageResponse;
    }

    const payload = await response.json();
    const image = extractImage(payload);

    if (!image) {
      return NextResponse.json(
        { error: "Image response did not include an image", payload },
        { status: 502 },
      );
    }

    const imageResponse = NextResponse.json({
      image,
      prompt,
      provider: "cloudflare-workers-ai",
      model,
    });

    setVisitorCookie(imageResponse, visitorId);

    return imageResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    const errorResponse = NextResponse.json(
      { error: "Unable to generate recipe image", message },
      { status: 400 },
    );

    setVisitorCookie(errorResponse, visitorId);

    return errorResponse;
  }
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

  if (existing.count >= maxImagesPerWindow) {
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

function buildPrompt(body: {
  title?: string;
  ingredients?: string[];
  cuisine?: string;
  type?: string;
}) {
  const title = body.title ?? "pantry recipe";
  const cuisine = body.cuisine ?? "simple";
  const type = body.type ?? "home-cooked meal";
  const ingredients = body.ingredients?.slice(0, 8).join(", ") ?? "fresh ingredients";

  return [
    `A tasteful editorial food photograph of ${title}.`,
    `Cuisine direction: ${cuisine}. Recipe type: ${type}.`,
    `Visible ingredients: ${ingredients}.`,
    "Natural light, dark table, minimal plating, realistic food photography, no text.",
  ].join(" ");
}

function extractImage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const result = record.result;

  if (typeof result === "string") {
    return result.startsWith("data:") ? result : `data:image/png;base64,${result}`;
  }

  if (result && typeof result === "object") {
    const resultRecord = result as Record<string, unknown>;
    const image = resultRecord.image;

    if (typeof image === "string") {
      return image.startsWith("data:") ? image : `data:image/png;base64,${image}`;
    }
  }

  return undefined;
}
