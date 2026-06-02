export type RecipeIngredient = {
  nodeId: number;
  name: string;
  primaryCategory: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  tag?: {
    foodGroup?: string;
    cuisineRegion: string;
    novaLevel?: number | null;
  };
};

export type TemplateRecipe = {
  id: string;
  title: string;
  type: string;
  servings: number;
  time: string;
  cuisine: string;
  pantryUsed: string[];
  nextBuy: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  rationale: string;
};

type TemplateRecipeInput = {
  pantry: RecipeIngredient[];
  recommendations: Array<{
    ingredient: RecipeIngredient;
    score: number;
  }>;
};

const pantryStaples = ["salt", "black pepper", "water"];

export function buildTemplateRecipes({
  pantry,
  recommendations,
}: TemplateRecipeInput): TemplateRecipe[] {
  const pantryNames = pantry.map((ingredient) => ingredient.name);

  return recommendations.slice(0, 4).map(({ ingredient }, index) => {
    const corePantry = pantryNames.slice(0, 4);
    const cuisine = humanize(ingredient.tag?.cuisineRegion ?? "universal");
    const type = chooseRecipeType(ingredient, corePantry);
    const title = buildTitle(ingredient, corePantry, type, cuisine);
    const ingredients = buildIngredientList(ingredient, corePantry, cuisine);
    const tags = buildTags(ingredient, cuisine);

    return {
      id: `${ingredient.nodeId}-${index}`,
      title,
      type,
      servings: chooseServings(type),
      time: chooseTime(type, ingredient.primaryCategory),
      cuisine,
      pantryUsed: corePantry,
      nextBuy: ingredient.name,
      ingredients,
      instructions: buildInstructions(ingredient, corePantry, type, cuisine),
      tags,
      rationale: buildRationale(ingredient, corePantry, cuisine),
    };
  });
}

function chooseRecipeType(ingredient: RecipeIngredient, pantry: string[]) {
  const category = ingredient.primaryCategory;
  const pantryText = pantry.join(" ").toLowerCase();

  if (pantryText.includes("rice") || category === "Grain") {
    return "bowl";
  }

  if (category === "Sauce" || category === "Condiment") {
    return "glaze";
  }

  if (category === "Spice" || category === "Herb") {
    return "aromatic skillet";
  }

  if (category === "Vegetable" || category === "Legume") {
    return ingredient.isVegan ? "plant plate" : "plate";
  }

  if (category === "Meat" || category === "Seafood") {
    return "supper plate";
  }

  return "pantry meal";
}

function buildTitle(
  ingredient: RecipeIngredient,
  pantry: string[],
  type: string,
  cuisine: string,
) {
  const anchor = pantry[0] ? humanize(pantry[0]) : "pantry";
  const pair = humanize(ingredient.name);

  if (cuisine.toLowerCase() !== "universal") {
    return `${cuisine} ${pair} ${anchor} ${type}`;
  }

  return `${pair} ${anchor} ${type}`;
}

function buildIngredientList(
  ingredient: RecipeIngredient,
  pantry: string[],
  cuisine: string,
) {
  const finish = cuisine.toLowerCase().includes("east") ? "soy sauce or vinegar" : "lemon or vinegar";

  return [
    humanize(ingredient.name),
    ...pantry.map(humanize),
    ...pantryStaples,
    "oil or cooking fat",
    finish,
  ];
}

function buildInstructions(
  ingredient: RecipeIngredient,
  pantry: string[],
  type: string,
  cuisine: string,
) {
  const anchor = pantry[0] ? humanize(pantry[0]) : "your main pantry ingredient";
  const supporting = pantry.slice(1, 4).map(humanize).join(", ");
  const next = humanize(ingredient.name);
  const finish = cuisine.toLowerCase().includes("east")
    ? "Finish with soy sauce or vinegar for brightness."
    : "Finish with lemon or vinegar for brightness.";

  return [
    `Prep ${next}, ${anchor}${supporting ? `, and ${supporting}` : ""} into bite-size pieces.`,
    `Warm oil in a pan and cook the heartier pantry ingredients first.`,
    `Add ${next} and season with salt, black pepper, and a small splash of water.`,
    `${finish}`,
    `Serve as a ${type}; keep the texture loose enough to spoon or plate cleanly.`,
  ];
}

function chooseServings(type: string) {
  return type.includes("plate") ? 2 : 3;
}

function chooseTime(type: string, category: string) {
  if (type === "glaze" || category === "Herb" || category === "Spice") {
    return "15-25 min";
  }

  if (category === "Meat" || category === "Seafood") {
    return "30-40 min";
  }

  return "25-35 min";
}

function buildTags(ingredient: RecipeIngredient, cuisine: string) {
  return [
    cuisine,
    ingredient.isVegan ? "vegan" : ingredient.isVegetarian ? "vegetarian" : "",
    ingredient.tag?.foodGroup ? humanize(ingredient.tag.foodGroup) : "",
    ingredient.tag?.novaLevel ? `NOVA ${ingredient.tag.novaLevel}` : "",
  ].filter(Boolean);
}

function buildRationale(
  ingredient: RecipeIngredient,
  pantry: string[],
  cuisine: string,
) {
  const anchor = pantry[0] ? humanize(pantry[0]) : "your pantry";
  const pair = humanize(ingredient.name);
  const category = humanize(ingredient.primaryCategory);

  return `${pair} adds a ${category.toLowerCase()} direction to ${anchor}, keeping the recipe close to ${cuisine.toLowerCase()} pantry logic without needing a live model call.`;
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}
