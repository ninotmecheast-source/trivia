import GameResults from '../GameResults';

export default function GameResultsExample() {
  const handlePlayAgain = () => {
    console.log('Play again triggered');
  };

  const handleChangeCategory = () => {
    console.log('Change category triggered');
  };

  return (
    <GameResults
      score={750}
      totalQuestions={10}
      correctAnswers={8}
      category="Science & Nature"
      timeElapsed={245}
      onPlayAgain={handlePlayAgain}
      onChangeCategory={handleChangeCategory}
    />
  );
}