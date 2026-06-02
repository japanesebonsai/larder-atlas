import { NextResponse } from "next/server";

const recipeSelect =
  "id,title,type,cuisine,servings,time,pantry_used,next_buy,ingredients,instructions,image_url,source,created_at";

type RecipePayload = {
  title?: string;
  type?: string;
  cuisine?: string;
  servings?: number;
  time?: string;
  pantryUsed?: string[];
  nextBuy?: string;
  ingredients?: string[];
  instructions?: string[];
  imageUrl?: string;
  source?: string;
};

type SupabaseRecipeRow = {
  id: string;
  title: string;
  type: string;
  cuisine: string;
  servings: number;
  time: string;
  pantry_used: string[];
  next_buy: string;
  ingredients: string[];
  instructions: string[];
  image_url: string | null;
  source: string;
  created_at: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const client = getSupabaseClient();

  if (!client) {
    return NextResponse.json({ configured: false, recipes: [] });
  }

  const response = await fetch(
    `${client.url}/rest/v1/recipes?select=${recipeSelect}&order=created_at.desc&limit=24`,
    {
      headers: client.headers,
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Unable to load saved recipes", message: await response.text() },
      { status: response.status },
    );
  }

  const rows = (await response.json()) as SupabaseRecipeRow[];

  return NextResponse.json({
    configured: true,
    recipes: rows.map(toPublicRecipe),
  });
}

export async function POST(request: Request) {
  const client = getSupabaseClient();

  if (!client) {
    return NextResponse.json(
      {
        error: "Recipe storage is not configured",
        message: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to save recipes.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as RecipePayload;
  const recipe = normalizeRecipe(body);

  if (!recipe) {
    return NextResponse.json(
      { error: "Recipe is incomplete", message: "Title, ingredients, and instructions are required." },
      { status: 400 },
    );
  }

  const response = await fetch(`${client.url}/rest/v1/recipes`, {
    method: "POST",
    headers: {
      ...client.headers,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(recipe),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Unable to save recipe", message: await response.text() },
      { status: response.status },
    );
  }

  const rows = (await response.json()) as SupabaseRecipeRow[];
  const savedRecipe = rows[0];

  return NextResponse.json({
    recipe: savedRecipe ? toPublicRecipe(savedRecipe) : null,
  });
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  };
}

function normalizeRecipe(body: RecipePayload) {
  if (!body.title || !body.ingredients?.length || !body.instructions?.length) {
    return null;
  }

  return {
    title: body.title,
    type: body.type ?? "pantry meal",
    cuisine: body.cuisine ?? "Universal",
    servings: body.servings ?? 2,
    time: body.time ?? "25-35 min",
    pantry_used: body.pantryUsed ?? [],
    next_buy: body.nextBuy ?? "",
    ingredients: body.ingredients,
    instructions: body.instructions,
    image_url: body.imageUrl ?? null,
    source: body.source ?? "template",
  };
}

function toPublicRecipe(row: SupabaseRecipeRow) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    cuisine: row.cuisine,
    servings: row.servings,
    time: row.time,
    pantryUsed: row.pantry_used,
    nextBuy: row.next_buy,
    ingredients: row.ingredients,
    instructions: row.instructions,
    imageUrl: row.image_url,
    source: row.source,
    createdAt: row.created_at,
  };
}
