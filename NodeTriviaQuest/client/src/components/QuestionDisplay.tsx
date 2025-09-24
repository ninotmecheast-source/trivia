import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
}

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  score: number;
  onAnswerSelect: (answerIndex: number) => void;
  selectedAnswer?: number;
  showResult?: boolean;
  onNextQuestion: () => void;
}

export default function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  score,
  onAnswerSelect,
  selectedAnswer,
  showResult = false,
  onNextQuestion
}: QuestionDisplayProps) {
  const progress = (questionNumber / totalQuestions) * 100;
  
  const getAnswerButtonVariant = (index: number) => {
    if (!showResult) {
      return selectedAnswer === index ? 'default' : 'outline';
    }
    
    if (index === question.correctAnswer) {
      return 'default';
    }
    
    if (selectedAnswer === index && index !== question.correctAnswer) {
      return 'destructive';
    }
    
    return 'outline';
  };
  
  const getAnswerButtonClass = (index: number) => {
    if (!showResult) return '';
    
    if (index === question.correctAnswer) {
      return 'bg-chart-2 text-white border-chart-2 hover:bg-chart-2/90';
    }
    
    if (selectedAnswer === index && index !== question.correctAnswer) {
      return 'bg-destructive text-destructive-foreground border-destructive';
    }
    
    return '';
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      {/* Header with progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Badge variant="outline" data-testid="badge-question-number">
              Question {questionNumber} of {totalQuestions}
            </Badge>
            <Badge variant="secondary" data-testid="badge-category">
              {question.category}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Score</p>
            <p className="text-xl font-mono font-bold" data-testid="text-score">{score}</p>
          </div>
        </div>
        <Progress value={progress} className="h-2" data-testid="progress-questions" />
      </div>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-xl font-semibold leading-relaxed" data-testid="text-question">
            {question.question}
          </h2>
        </CardHeader>
      </Card>

      {/* Answer Options */}
      <div className="space-y-3 mb-6">
        {question.options.map((option, index) => (
          <Button
            key={index}
            variant={getAnswerButtonVariant(index)}
            className={`w-full justify-start text-left h-auto p-4 text-wrap ${getAnswerButtonClass(index)}`}
            onClick={() => !showResult && onAnswerSelect(index)}
            disabled={showResult}
            data-testid={`button-answer-${index}`}
          >
            <span className="mr-3 font-mono font-bold">
              {String.fromCharCode(65 + index)}.
            </span>
            <span>{option}</span>
          </Button>
        ))}
      </div>

      {/* Next Button */}
      {showResult && (
        <div className="flex justify-center">
          <Button onClick={onNextQuestion} data-testid="button-next">
            {questionNumber === totalQuestions ? 'View Results' : 'Next Question'}
          </Button>
        </div>
      )}
    </div>
  );
}