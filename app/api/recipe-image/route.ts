import { NextResponse } from "next/server";

const defaultModel = "@cf/black-forest-labs/flux-1-schnell";

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

      return NextResponse.json({
        image: `data:${contentType};base64,${base64}`,
        prompt,
        provider: "cloudflare-workers-ai",
        model,
      });
    }

    const payload = await response.json();
    const image = extractImage(payload);

    if (!image) {
      return NextResponse.json(
        { error: "Image response did not include an image", payload },
        { status: 502 },
      );
    }

    return NextResponse.json({
      image,
      prompt,
      provider: "cloudflare-workers-ai",
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Unable to generate recipe image", message },
      { status: 400 },
    );
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
