import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Clock, RotateCcw } from "lucide-react";

interface GameResultsProps {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  category: string;
  timeElapsed?: number;
  onPlayAgain: () => void;
  onChangeCategory: () => void;
}

export default function GameResults({
  score,
  totalQuestions,
  correctAnswers,
  category,
  timeElapsed,
  onPlayAgain,
  onChangeCategory
}: GameResultsProps) {
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  
  const getPerformanceLevel = () => {
    if (percentage >= 90) return { level: "Excellent!", color: "text-chart-2", icon: Trophy };
    if (percentage >= 75) return { level: "Great Job!", color: "text-chart-4", icon: Target };
    if (percentage >= 60) return { level: "Good Work!", color: "text-primary", icon: Target };
    return { level: "Keep Trying!", color: "text-muted-foreground", icon: RotateCcw };
  };
  
  const performance = getPerformanceLevel();
  const PerformanceIcon = performance.icon;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <PerformanceIcon className={`h-16 w-16 mx-auto mb-4 ${performance.color}`} />
        <h1 className="text-4xl font-bold mb-2" data-testid="text-performance-level">
          {performance.level}
        </h1>
        <p className="text-muted-foreground">Quiz completed</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Final Results</h2>
            <Badge variant="outline" data-testid="badge-category">{category}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="text-center py-6 bg-accent rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Final Score</p>
            <p className="text-5xl font-mono font-bold text-primary" data-testid="text-final-score">
              {score}
            </p>
          </div>
          
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-card rounded-lg border">
              <p className="text-2xl font-bold" data-testid="text-correct-answers">
                {correctAnswers}/{totalQuestions}
              </p>
              <p className="text-sm text-muted-foreground">Correct Answers</p>
            </div>
            
            <div className="text-center p-4 bg-card rounded-lg border">
              <p className="text-2xl font-bold" data-testid="text-percentage">
                {percentage}%
              </p>
              <p className="text-sm text-muted-foreground">Accuracy</p>
            </div>
            
            {timeElapsed && (
              <>
                <div className="text-center p-4 bg-card rounded-lg border">
                  <p className="text-2xl font-bold font-mono" data-testid="text-time-elapsed">
                    {formatTime(timeElapsed)}
                  </p>
                  <p className="text-sm text-muted-foreground">Time Taken</p>
                </div>
                
                <div className="text-center p-4 bg-card rounded-lg border">
                  <p className="text-2xl font-bold" data-testid="text-avg-time">
                    {formatTime(Math.round(timeElapsed / totalQuestions))}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg per Question</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          onClick={onPlayAgain} 
          size="lg"
          data-testid="button-play-again"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Play Again
        </Button>
        <Button 
          variant="outline" 
          onClick={onChangeCategory} 
          size="lg"
          data-testid="button-change-category"
        >
          Choose Different Category
        </Button>
      </div>
    </div>
  );
}