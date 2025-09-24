import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Moon, Sun } from "lucide-react";
import { useState } from "react";

interface TriviaHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
  currentScore?: number;
}

export default function TriviaHeader({ showBackButton, onBack, currentScore }: TriviaHeaderProps) {
  const [isDark, setIsDark] = useState(false);
  
  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
    console.log('Dark mode toggled:', !isDark);
  };

  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack}
                data-testid="button-back"
              >
                ← Back
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold" data-testid="text-title">Trivia Server</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {typeof currentScore === 'number' && (
              <Badge variant="secondary" data-testid="badge-score">
                Score: {currentScore}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              data-testid="button-theme-toggle"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}