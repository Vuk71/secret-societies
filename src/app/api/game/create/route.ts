
import { NextResponse } from 'next/server';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Player, GameState, ZoneName, StoredSecretCardReference, SecretCard, VictoryCondition, EventCard } from '@/types/game';
import { ZONES_DATA, ZONE_NAMES, mockSecretCards, shuffleArray, getNextCardInstanceId, mockVictoryConditions, mockEventCards } from '@/types/game';

// Helper function to create an initial player state
function createInitialPlayerForAPI(id: string, name: string): Player {
  console.log('[API Create] Creating initial player for API:', name, 'with ID:', id);
  const availableZoneNames = ZONE_NAMES.filter(zn => zn !== "Royal Chamber");
  if (availableZoneNames.length === 0) {
    console.warn("[API Create] No available starting zones after filtering Royal Chamber. Defaulting to first zone.");
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

// Helper function to create initial game state for the lobby
function createInitialLobbyStateForAPI(hostName: string): Omit<GameState, 'sessionId'> {
  console.log('[API Create] Creating initial lobby state for host:', hostName);
  const hostPlayerId = `p${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const hostPlayer = createInitialPlayerForAPI(hostPlayerId, hostName);

  const initialShuffledEventDeck = shuffleArray([...mockEventCards]);
  const initialUpcomingEvent = initialShuffledEventDeck.length > 0 ? initialShuffledEventDeck.shift()! : null;


  const initialGameState: Omit<GameState, 'sessionId'> = {
    players: [hostPlayer],
    currentPlayerId: hostPlayer.id, 
    currentTurnPlayerIndex: 0, 
    vcSelectionPlayerIndex: 0, 
    round: 1,
    turnPhase: 'VC_SELECTION' as const, 
    suspicion: 0,
    activeEvent: null, 
    upcomingEvent: initialUpcomingEvent, 
    zones: ZONES_DATA.map(zoneData => ({
      name: zoneData.name,
      borders: zoneData.borders,
      secretDeck: shuffleArray(
        mockSecretCards
          .filter(scMaster => scMaster.zone === zoneData.name)
          .map((scMaster): StoredSecretCardReference => ({
            id: scMaster.id,
            instanceId: getNextCardInstanceId(scMaster.id)
          }))
      )
    })),
    turnOrder: [hostPlayer.id], 
    gameLog: [`Lobby created by ${hostName}. Waiting for players...`],
    maxSuspicionAdjustment: 2,
    currentRoundSuspicionNetChange: 0,
    revealedMaskTypesThisTurn: [],
    eventDeck: initialShuffledEventDeck, 
    availableVictoryConditions: shuffleArray(
        mockVictoryConditions.map(({ isAchieved, ...vcData }) => vcData)
    ),
    currentlyRevealedMasks: [],
  };
  console.log('[API Create] Initial lobby state created:', initialGameState);
  return initialGameState;
}

export async function POST(request: Request) {
  console.log('[API Create] POST request received.');
  try {
    const body = await request.json();
    console.log('[API Create] Request body:', body);
    const { hostName, password } = body;

    if (!hostName || typeof hostName !== 'string' || hostName.trim() === '') {
      console.log('[API Create] Error: Host name is required.');
      return NextResponse.json({ error: 'Host name is required' }, { status: 400 });
    }

    const trimmedHostName = hostName.trim();
    console.log('[API Create] Host name trimmed:', trimmedHostName);
    const initialLobbyData = createInitialLobbyStateForAPI(trimmedHostName);
    console.log('[API Create] Initial lobby data prepared for Firestore:', initialLobbyData);

    const gameSessionsCollection = collection(db, 'gameSessions');
    console.log('[API Create] gameSessions collection reference obtained.');

    console.log('[API Create] Attempting to add document to Firestore...');
    let docRef;
    try {
      docRef = await addDoc(gameSessionsCollection, {
        ...initialLobbyData,
        password: password || null, 
        createdAt: new Date().toISOString(),
      });
      console.log('[API Create] Document added to Firestore with ID:', docRef.id);
    } catch (firestoreError) {
      console.error('[API Create] Firestore addDoc error:', firestoreError);
      const errorMessage = firestoreError instanceof Error ? firestoreError.message : String(firestoreError);
      return NextResponse.json({ error: 'Failed to save game to database', details: errorMessage }, { status: 500 });
    }

    const sessionId = docRef.id;
    const hostPlayerIdToReturn = initialLobbyData.players[0].id;


    console.log('[API Create] Successfully created game session. Session ID:', sessionId, 'Host Player ID:', hostPlayerIdToReturn);
    return NextResponse.json({ sessionId, hostPlayerId: hostPlayerIdToReturn, hostName: trimmedHostName }, { status: 201 });

  } catch (error) {
    console.error('[API Create] General error in POST handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: 'Failed to create game lobby', details: errorMessage }, { status: 500 });
  }
}
    
