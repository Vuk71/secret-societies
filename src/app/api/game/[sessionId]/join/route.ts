
import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GameState, Player } from '@/types/game';
import { ZONE_NAMES, MAX_PLAYERS } from '@/types/game';

// Simplified initial player creation for joining players
function createJoiningPlayer(id: string, name: string): Player {
  const availableZoneNames = ZONE_NAMES.filter(zn => zn !== "Royal Chamber");
  if (availableZoneNames.length === 0) {
     console.warn("[API Join] No available starting zones after filtering Royal Chamber. Defaulting to first zone.");
     availableZoneNames.push(ZONE_NAMES[0]);
  }
  return {
    id,
    name,
    gold: 5,
    trust: 8,
    information: 2,
    secrecy: 0,
    hand: [],
    masks: { lunar: null, solar: null, shadow: null, eclipse: null },
    currentZone: availableZoneNames[Math.floor(Math.random() * availableZoneNames.length)],
    victoryCondition: null,
    isEliminated: false,
    isVictoryConditionRevealed: false, // Initialize new field
  };
}

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { playerName, password } = body;

    if (!playerName || typeof playerName !== 'string' || playerName.trim() === '') {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    const gameDocRef = doc(db, 'gameSessions', sessionId);
    const gameDocSnap = await getDoc(gameDocRef);

    if (!gameDocSnap.exists()) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
    }

    let gameData = gameDocSnap.data() as GameState;

    if (gameData.password && gameData.password !== password) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    if (gameData.players.length >= MAX_PLAYERS) {
      return NextResponse.json({ error: `Lobby is full. Maximum ${MAX_PLAYERS} players allowed.` }, { status: 409 });
    }

    // Players can only join if the game is in the 'VC_SELECTION' phase AND activeEvent is null OR 'VC_SELECTION_PENDING'
    // This means host hasn't fully started the game yet beyond the initial lobby setup.
    if (gameData.turnPhase !== 'VC_SELECTION' || (gameData.activeEvent !== null && gameData.activeEvent.id !== 'VC_SELECTION_PENDING')) {
      return NextResponse.json({ error: 'Cannot join game: The game has already started or is not accepting new players.' }, { status: 403 });
    }

    // Check if player with this name already exists
    if (gameData.players.some(p => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
         return NextResponse.json({ error: 'Player name already taken in this session.' }, { status: 409 });
    }


    let newPlayerId = `p${Date.now()}${gameData.players.length}`;
    while (gameData.players.some(p => p.id === newPlayerId)) {
        newPlayerId = `p${Date.now()}${gameData.players.length}_${Math.random().toString(36).substring(2,5)}`;
    }

    const newPlayer = createJoiningPlayer(newPlayerId, playerName.trim());

    const updatedPlayers = [...gameData.players, newPlayer];
    // turnOrder is shuffled when the host starts the game from the lobby
    // gameData.turnOrder = [...gameData.turnOrder, newPlayer.id];

    await updateDoc(gameDocRef, {
      players: updatedPlayers,
      // turnOrder: updatedTurnOrder, // Turn order managed at game start
      gameLog: arrayUnion(`[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${newPlayer.name} joined the lobby.`)
    });

    return NextResponse.json({
        message: 'Player joined successfully',
        playerId: newPlayer.id,
    }, { status: 200 });

  } catch (error) {
    console.error('Error joining game session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to join game session', details: errorMessage }, { status: 500 });
  }
}
