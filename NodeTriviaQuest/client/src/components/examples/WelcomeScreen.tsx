import WelcomeScreen from '../WelcomeScreen';

export default function WelcomeScreenExample() {
  const handleStartGame = (category: string) => {
    console.log('Starting game with category:', category);
  };

  return <WelcomeScreen onStartGame={handleStartGame} />;
}