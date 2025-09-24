import TriviaHeader from '../TriviaHeader';

export default function TriviaHeaderExample() {
  const handleBack = () => {
    console.log('Back button triggered');
  };

  return (
    <TriviaHeader
      showBackButton={true}
      onBack={handleBack}
      currentScore={350}
    />
  );
}