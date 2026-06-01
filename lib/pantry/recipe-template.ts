export type RecipeIngredient = {
  nodeId: number;
  name: string;
  primaryCategory: string;
  tag?: {
    cuisineRegion: string;
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
    const type = chooseRecipeType(ingredient.primaryCategory, corePantry);
    const title = buildTitle(ingredient.name, corePantry, type);
    const ingredients = buildIngredientList(ingredient.name, corePantry);

    return {
      id: `${ingredient.nodeId}-${index}`,
      title,
      type,
      servings: 2,
      time: "25-35 min",
      cuisine,
      pantryUsed: corePantry,
      nextBuy: ingredient.name,
      ingredients,
      instructions: buildInstructions(ingredient.name, corePantry, type),
    };
  });
}

function chooseRecipeType(category: string, pantry: string[]) {
  const pantryText = pantry.join(" ").toLowerCase();

  if (pantryText.includes("rice") || category === "Grain") {
    return "bowl";
  }

  if (category === "Spice" || category === "Herb") {
    return "skillet";
  }

  if (category === "Vegetable" || category === "Legume") {
    return "plate";
  }

  return "pantry meal";
}

function buildTitle(nextBuy: string, pantry: string[], type: string) {
  const anchor = pantry[0] ? humanize(pantry[0]) : "pantry";

  return `${humanize(nextBuy)} ${anchor} ${type}`;
}

function buildIngredientList(nextBuy: string, pantry: string[]) {
  return [
    humanize(nextBuy),
    ...pantry.map(humanize),
    ...pantryStaples,
    "oil or cooking fat",
  ];
}

function buildInstructions(nextBuy: string, pantry: string[], type: string) {
  const anchor = pantry[0] ? humanize(pantry[0]) : "your main pantry ingredient";
  const supporting = pantry.slice(1, 4).map(humanize).join(", ");
  const next = humanize(nextBuy);

  return [
    `Prep ${next}, ${anchor}${supporting ? `, and ${supporting}` : ""}.`,
    `Warm oil in a pan and cook the heartier ingredients first.`,
    `Fold in ${next} and season with salt and black pepper.`,
    `Finish as a ${type} and adjust with a splash of water if needed.`,
  ];
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}
