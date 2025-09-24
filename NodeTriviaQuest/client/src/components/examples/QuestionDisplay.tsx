import { useState } from "react";
import QuestionDisplay from '../QuestionDisplay';

const mockQuestion = {
  id: "q1",
  question: "What is the largest planet in our solar system?",
  options: [
    "Earth",
    "Jupiter",
    "Saturn",
    "Neptune"
  ],
  correctAnswer: 1,
  category: "Science"
};

export default function QuestionDisplayExample() {
  const [selectedAnswer, setSelectedAnswer] = useState<number>();
  const [showResult, setShowResult] = useState(false);

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setTimeout(() => setShowResult(true), 500);
  };

  const handleNextQuestion = () => {
    console.log('Next question triggered');
    setSelectedAnswer(undefined);
    setShowResult(false);
  };

  return (
    <QuestionDisplay
      question={mockQuestion}
      questionNumber={1}
      totalQuestions={10}
      score={50}
      onAnswerSelect={handleAnswerSelect}
      selectedAnswer={selectedAnswer}
      showResult={showResult}
      onNextQuestion={handleNextQuestion}
    />
  );
}