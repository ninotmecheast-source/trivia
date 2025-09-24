import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Users, Target, Zap } from "lucide-react";
import CategorySelector from "./CategorySelector";
import { useState } from "react";

interface WelcomeScreenProps {
  onStartGame: (category: string) => void;
}

export default function WelcomeScreen({ onStartGame }: WelcomeScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [showCategories, setShowCategories] = useState(false);
  
  const features = [
    {
      icon: Brain,
      title: "Test Your Knowledge",
      description: "Challenge yourself with questions across multiple categories"
    },
    {
      icon: Target,
      title: "Score Points",
      description: "Earn points for correct answers and track your progress"
    },
    {
      icon: Zap,
      title: "Instant Feedback",
      description: "Get immediate results and explanations for each question"
    },
    {
      icon: Users,
      title: "Multiple Categories",
      description: "Choose from science, history, sports, entertainment and more"
    }
  ];

  if (showCategories) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center mb-6">
            <Button 
              variant="ghost" 
              onClick={() => setShowCategories(false)}
              data-testid="button-back-to-welcome"
            >
              ← Back to Home
            </Button>
          </div>
          <CategorySelector 
            onCategorySelect={(category) => {
              setSelectedCategory(category);
              onStartGame(category);
            }}
            selectedCategory={selectedCategory}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Brain className="h-16 w-16 text-primary mr-4" />
            <h1 className="text-6xl font-bold" data-testid="text-main-title">
              Trivia Server
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Test your knowledge with our interactive quiz game featuring multiple categories, 
            real-time scoring, and instant feedback.
          </p>
          <Button 
            size="lg" 
            onClick={() => setShowCategories(true)}
            className="text-lg px-8 py-4"
            data-testid="button-start-playing"
          >
            Start Playing
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index} className="text-center hover-elevate">
                <CardContent className="pt-6">
                  <IconComponent className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2" data-testid={`text-feature-title-${index}`}>
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid={`text-feature-description-${index}`}>
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Join thousands of players testing their knowledge</p>
          <div className="flex justify-center gap-8 text-sm">
            <div>
              <span className="font-bold text-2xl text-primary">6</span>
              <p className="text-muted-foreground">Categories</p>
            </div>
            <div>
              <span className="font-bold text-2xl text-primary">100+</span>
              <p className="text-muted-foreground">Questions</p>
            </div>
            <div>
              <span className="font-bold text-2xl text-primary">∞</span>
              <p className="text-muted-foreground">Fun</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}