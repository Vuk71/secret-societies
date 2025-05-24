
import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GameState } from '@/types/game';

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const gameDocRef = doc(db, 'gameSessions', sessionId);
    const gameDocSnap = await getDoc(gameDocRef);

    if (!gameDocSnap.exists()) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
    }

    const gameData = gameDocSnap.data() as GameState;
    // Ensure sessionId is part of the returned data if it wasn't stored explicitly
    // (though our create route doesn't add it to the doc body, Firestore provides the ID)
    return NextResponse.json({ ...gameData, sessionId: gameDocSnap.id });

  } catch (error) {
    console.error('Error fetching game session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch game session', details: errorMessage }, { status: 500 });
  }
}
