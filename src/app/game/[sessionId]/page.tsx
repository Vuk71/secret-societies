
import { GameClientWrapper } from '@/components/game/GameClientWrapper';

type GamePageProps = {
  params: { sessionId: string };
};

export default function GamePage({ params }: GamePageProps) {
  // The GameClientWrapper will handle fetching/mocking initial game state
  // based on the sessionId and query parameters.
  return <GameClientWrapper initialSessionId={params.sessionId} />;
}

// Metadata can be dynamic if needed, but for now, a generic one.
export async function generateMetadata({ params }: GamePageProps) {
  return {
    title: `Game Session: ${params.sessionId} - Secret Societies`,
    description: `Playing Secret Societies session ${params.sessionId}.`,
  };
}
