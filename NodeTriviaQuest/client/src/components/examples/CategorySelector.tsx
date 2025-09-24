import { useState } from "react";
import CategorySelector from '../CategorySelector';

export default function CategorySelectorExample() {
  const [selectedCategory, setSelectedCategory] = useState<string>();

  return (
    <CategorySelector 
      onCategorySelect={setSelectedCategory}
      selectedCategory={selectedCategory}
    />
  );
}