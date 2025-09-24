import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Globe, Atom, Trophy, Gamepad2, Music } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Category } from "@shared/schema";

// Map backend icon strings to React components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Globe, 
  Atom,
  Trophy,
  Gamepad2,
  Music,
};

interface CategorySelectorProps {
  onCategorySelect: (categoryId: string) => void;
  selectedCategory?: string;
}

export default function CategorySelector({ onCategorySelect, selectedCategory }: CategorySelectorProps) {
  const { toast } = useToast();
  
  // Fetch categories from API
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['/api/categories'],
    select: (data: Category[]) => {
      // Map backend categories to include React components for icons
      return data.map(category => ({
        ...category,
        iconComponent: iconMap[category.icon] || BookOpen, // fallback to BookOpen if icon not found
      }));
    },
    refetchOnWindowFocus: false,
  });
  
  // Show error toast if categories fail to load
  if (error && !isLoading) {
    toast({
      title: "Error",
      description: "Failed to load categories. Please refresh the page.",
      variant: "destructive",
    });
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Choose Your Category</h2>
          <p className="text-muted-foreground">Select a topic to test your knowledge</p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !categories) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Choose Your Category</h2>
          <p className="text-muted-foreground">Select a topic to test your knowledge</p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-destructive mb-4">Failed to load categories</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-primary hover:underline"
              data-testid="button-reload-categories"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Choose Your Category</h2>
        <p className="text-muted-foreground">Select a topic to test your knowledge</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const IconComponent = category.iconComponent;
          const isSelected = selectedCategory === category.id;
          
          return (
            <Card 
              key={category.id} 
              className={`cursor-pointer transition-all duration-200 hover-elevate ${
                isSelected ? 'ring-2 ring-primary bg-accent' : ''
              }`}
              onClick={() => onCategorySelect(category.id)}
              data-testid={`card-category-${category.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <IconComponent className="h-8 w-8 text-primary" />
                  <Badge variant="secondary" data-testid={`badge-count-${category.id}`}>
                    Available
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold text-lg mb-2" data-testid={`text-name-${category.id}`}>
                  {category.name}
                </h3>
                <p className="text-sm text-muted-foreground" data-testid={`text-description-${category.id}`}>
                  {category.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {selectedCategory && (
        <div className="flex justify-center mt-8">
          <Button 
            size="lg" 
            onClick={() => onCategorySelect(selectedCategory)}
            data-testid="button-start-game"
          >
            Start Quiz
          </Button>
        </div>
      )}
    </div>
  );
}