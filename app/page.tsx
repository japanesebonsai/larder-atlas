import { PantryInputExperience } from "./components/PantryInputExperience";
import { loadEpicureIngredients } from "@/lib/epicure";

export default async function Home() {
  const ingredientNames = (await loadEpicureIngredients())
    .map((ingredient) => ingredient.name)
    .sort((a, b) => a.localeCompare(b));

  return <PantryInputExperience ingredientNames={ingredientNames} />;
}
