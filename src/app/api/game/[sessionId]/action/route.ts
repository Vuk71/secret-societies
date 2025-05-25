
import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, deleteDoc, runTransaction, FieldValue, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GameState, Player, StoredSecretCardReference, SecretCard, ZoneName, EventCard, VictoryCondition, PlayerResourceType } from '@/types/game';
import { mockEventCards, shuffleArray, ZONES_DATA, mockSecretCards, getNextCardInstanceId, MIN_PLAYERS, MAX_PLAYERS, mockVictoryConditions, getRandomVictoryConditions as clientGetRandomVCs, getFullSecretCardDetailsServer } from '@/types/game';


const REVEAL_INFO_COST = 3; // This constant will no longer be used for the check

function sanitizeFirebaseDocId(name: string): string {
  if (!name || typeof name !== 'string') return `default_player_stat_${Date.now()}`;
  // Replace characters not allowed or problematic in Firestore document IDs
  // Firestore IDs cannot contain / and cannot be . or ..
  // Let's replace common problematic characters with an underscore.
  return name.replace(/[.\/#[\]$]/g, '_').trim() || `default_player_stat_${Date.now()}`;
}


export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  let body: any;
  const routeSegmentSessionId = params.sessionId;
  console.log(`[API Action POST] Request for session ID from URL segment: '${routeSegmentSessionId}'`);

  if (!routeSegmentSessionId || routeSegmentSessionId === 'undefined') {
    console.error('[API Action POST] Session ID is missing or undefined in params.');
    return NextResponse.json({ error: 'Session ID is required and valid in path' }, { status: 400 });
  }

  try {
    body = await request.json();
    const { type, payload } = body;
    console.log(`[API Action POST] Received action type: ${type} for session: ${routeSegmentSessionId}, Payload:`, JSON.stringify(payload));

    if (!type || !payload) {
      console.error(`[API Action POST] Action type or payload missing for session: ${routeSegmentSessionId}. Type: ${type}`);
      return NextResponse.json({ error: 'Action type and payload are required' }, { status: 400 });
    }

    const gameDocRef = doc(db, 'gameSessions', routeSegmentSessionId);
    const gameDocSnap = await getDoc(gameDocRef);
    console.log(`[API Action POST] Firestore docSnap.exists for ID '${routeSegmentSessionId}': ${gameDocSnap.exists()}`);


    if (!gameDocSnap.exists()) {
      console.error(`[API Action POST] Game session with ID '${routeSegmentSessionId}' not found in Firestore.`);
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
    }

    let gameData = gameDocSnap.data() as GameState;
    gameData.sessionId = routeSegmentSessionId; 

    // Initialize potentially missing fields
    gameData.eventDeck = gameData.eventDeck || [];
    gameData.availableVictoryConditions = gameData.availableVictoryConditions || [];
    gameData.zones = gameData.zones || ZONES_DATA.map(zoneData => ({
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
    }));
    gameData.revealedMaskTypesThisTurn = gameData.revealedMaskTypesThisTurn || [];
    gameData.currentlyRevealedMasks = gameData.currentlyRevealedMasks || [];


    const newLogEntries: string[] = [];
    const serverAddLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      newLogEntries.push(`[${timestamp}] ${message}`);
    };

    const playerIndex = gameData.players.findIndex(p => p.id === payload.playerId);
    const player = playerIndex !== -1 ? gameData.players[playerIndex] : null;

    if (type === 'START_GAME_FROM_LOBBY') {
        console.log('[API START_GAME_FROM_LOBBY] Processing START_GAME_FROM_LOBBY action.');
        const hostId = payload.playerId;
        if (gameData.players.length === 0 || gameData.players[0].id !== hostId) {
            serverAddLog(`Attempt to start game by non-host or no players. Requester: ${hostId}, Host: ${gameData.players[0]?.id}`);
            return NextResponse.json({ error: 'Only the host can start the game.' }, { status: 403 });
        }

        if (gameData.players.length < MIN_PLAYERS || gameData.players.length > MAX_PLAYERS) {
            serverAddLog(`Attempt to start game with invalid player count: ${gameData.players.length}`);
            return NextResponse.json({ error: `Game requires ${MIN_PLAYERS}-${MAX_PLAYERS} players. Currently ${gameData.players.length}.` }, { status: 400 });
        }
        
        if (gameData.turnPhase !== 'VC_SELECTION' || (gameData.activeEvent && gameData.activeEvent.id !== 'VC_SELECTION_PENDING')) {
             if (gameData.activeEvent?.id === 'VC_SELECTION_PENDING') {
                 // This is okay, host is starting from lobby, this activeEvent is what we expect
             } else {
                 serverAddLog(`Attempt to start game from incorrect phase: ${gameData.turnPhase} or activeEvent indicates VC selection already in progress: ${gameData.activeEvent?.id}`);
                 return NextResponse.json({ error: 'Game cannot be started from this phase or state.' }, { status: 403 });
             }
        }


        console.log('[API START_GAME_FROM_LOBBY] Validations passed. Setting up game start.');

        // Set up turn order
        gameData.turnOrder = shuffleArray([...gameData.players.map(p => p.id)]);
        gameData.currentPlayerId = gameData.turnOrder[0];
        const firstPlayerForVCIndex = gameData.players.findIndex(p => p.id === gameData.currentPlayerId);

        if (firstPlayerForVCIndex === -1) {
             serverAddLog(`Error: Could not find first player (${gameData.currentPlayerId}) for VC selection.`);
             console.error(`[API START_GAME_FROM_LOBBY] Critical: Could not find first player ${gameData.currentPlayerId} in players array.`);
             return NextResponse.json({ error: 'Internal server error setting up VC selection.' }, { status: 500 });
        }
        gameData.vcSelectionPlayerIndex = firstPlayerForVCIndex;
        
        gameData.activeEvent = { id: 'VC_SELECTION_PENDING', name: 'Victory Condition Selection', description: 'Players are choosing their secret goals.' };
        
        // upcomingEvent was set at game creation, no need to change it here for starting VC selection.
        // activeEvent will become null and upcomingEvent will be set for Round 1 when last player selects VC.

        gameData.revealedMaskTypesThisTurn = []; 
        gameData.currentlyRevealedMasks = []; 

        serverAddLog(`Game started by host ${gameData.players[0].name} with ${gameData.players.length} players.`);
        serverAddLog(`Turn order: ${gameData.turnOrder.map(pid => gameData.players.find(p=>p.id===pid)?.name).join(', ')}.`);
        serverAddLog(`${gameData.players[firstPlayerForVCIndex].name} begins Victory Condition selection.`);
        console.log('[API START_GAME_FROM_LOBBY] Game setup complete. State:', JSON.stringify(gameData, null, 2));

    } else if (type === 'GET_VC_OFFER') {
        console.log('[API GET_VC_OFFER] Processing.');
        if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

        if (gameData.turnPhase !== 'VC_SELECTION' || gameData.activeEvent?.id !== 'VC_SELECTION_PENDING' || gameData.currentPlayerId !== player.id) {
            //return NextResponse.json({ error: 'Not your turn or not in VC selection phase.' }, { status: 403 });
            return NextResponse.json({});
        }
        gameData.availableVictoryConditions = gameData.availableVictoryConditions || shuffleArray(mockVictoryConditions.map(vc => { const { isAchieved, ...data } = vc; return data; }));
        
        const offeredVCs = clientGetRandomVCs(gameData.availableVictoryConditions, 3);
        console.log(`[API GET_VC_OFFER] Offering VCs: ${offeredVCs.map(vc => vc.name).join(', ')} to ${player.name}`);
        return NextResponse.json({ offeredVCs });

    } else if (type === 'SELECT_VC') {
        console.log('[API SELECT_VC] Start processing SELECT_VC action.');
        const { playerId, vcId } = payload as { playerId: string; vcId: string };
        console.log(`[API SELECT_VC] Payload: playerId=${playerId}, vcId=${vcId}`);

        const selectingPlayerIndex = gameData.players.findIndex(p => p.id === playerId);
        if (selectingPlayerIndex === -1) {
            console.error(`[API SELECT_VC] Critical Error: Player ID ${playerId} not found in gameData.players.`);
            return NextResponse.json({ error: 'Player not found for VC selection.' }, { status: 404 });
        }
        const selectingPlayer = gameData.players[selectingPlayerIndex];
        console.log(`[API SELECT_VC] Selecting player: ${selectingPlayer.name}`);

        if (gameData.turnPhase !== 'VC_SELECTION' || gameData.activeEvent?.id !== 'VC_SELECTION_PENDING') {
            console.log(`[API SELECT_VC] Incorrect phase or event. Phase: ${gameData.turnPhase}, Event: ${gameData.activeEvent?.id}`);
            return NextResponse.json({ error: 'Not in VC Selection phase' }, { status: 403 });
        }
        if (gameData.currentPlayerId !== playerId) {
            console.log(`[API SELECT_VC] Not player's turn. Current: ${gameData.currentPlayerId}, Requesting: ${playerId}`);
            return NextResponse.json({ error: 'Not your turn to select a Victory Condition.' }, { status: 403 });
        }

        const selectedVCMaster = mockVictoryConditions.find(v => v.id === vcId);
        if (!selectedVCMaster) {
            console.log(`[API SELECT_VC] Invalid VC ID: ${vcId}`);
            return NextResponse.json({ error: 'Invalid Victory Condition selected' }, { status: 400 });
        }
        console.log(`[API SELECT_VC] Selected VC Master: ${selectedVCMaster.name}`);
        
        const { isAchieved, ...vcDataToStore } = selectedVCMaster;
        gameData.players[selectingPlayerIndex].victoryCondition = vcDataToStore as Omit<VictoryCondition, 'isAchieved'>;
        
        gameData.availableVictoryConditions = gameData.availableVictoryConditions?.filter(vc => vc.id !== vcId) || [];
        console.log(`[API SELECT_VC] Player ${selectingPlayer.name} assigned VC. Remaining available VCs: ${gameData.availableVictoryConditions.length}`);

        serverAddLog(`${gameData.players[selectingPlayerIndex].name} has selected their Victory Condition.`);

        if (gameData.players.every(p => p.victoryCondition !== null)) {
            console.log('[API SELECT_VC] All players have selected VCs. Transitioning to Draw phase.');
            gameData.turnPhase = 'Draw';
            gameData.currentPlayerId = gameData.turnOrder[0]; 
            gameData.currentTurnPlayerIndex = gameData.players.findIndex(p => p.id === gameData.currentPlayerId);
            
            // For Round 1, no active event. Upcoming event was set when game was created/lobby started.
            gameData.activeEvent = null; // Active event becomes null for start of Round 1 gameplay
            // gameData.upcomingEvent remains as set by START_GAME_FROM_LOBBY or create game
            serverAddLog(`All players have selected Victory Conditions. Round 1 begins! It is now ${gameData.players[gameData.currentTurnPlayerIndex].name}'s turn (Draw Phase).`);
            serverAddLog(`Round 1: No Active Event.`);
            if (gameData.upcomingEvent) serverAddLog(`Upcoming Event for Round 1: ${gameData.upcomingEvent.name}.`);
            else serverAddLog(`No Upcoming Event for Round 1.`);
        } else {
            const currentVcSelectionOrderIndex = gameData.turnOrder.indexOf(playerId);
            if (currentVcSelectionOrderIndex === -1) {
                console.error(`[API SELECT_VC] Critical Error: Player ID ${playerId} not found in turnOrder.`);
                return NextResponse.json({ error: 'Internal server error processing VC turn order.' }, { status: 500 });
            }
            let nextVcSelectionOrderIndex = (currentVcSelectionOrderIndex + 1) % gameData.turnOrder.length;
            const nextPlayerToSelectVCId = gameData.turnOrder[nextVcSelectionOrderIndex];
            
            const nextVcPlayerGameIndex = gameData.players.findIndex(p => p.id === nextPlayerToSelectVCId);
            if (nextVcPlayerGameIndex === -1) {
                 console.error(`[API SELECT_VC] Critical Error: Next player ID ${nextPlayerToSelectVCId} not found in gameData.players for VC selection.`);
                 return NextResponse.json({ error: 'Internal server error finding next VC selector.' }, { status: 500 });
            }
            gameData.currentPlayerId = nextPlayerToSelectVCId;
            gameData.vcSelectionPlayerIndex = nextVcPlayerGameIndex; 
            console.log(`[API SELECT_VC] Passing VC selection to next player: ${gameData.players[gameData.vcSelectionPlayerIndex].name}`);
            serverAddLog(`Passing to ${gameData.players[gameData.vcSelectionPlayerIndex].name} for VC selection.`);
        }

    } else if (type === 'TERMINATE_SESSION') {
        console.log('[API TERMINATE_SESSION] Processing.');
        const hostId = payload.playerId;
        if (gameData.players.length === 0 || gameData.players[0].id !== hostId) {
            return NextResponse.json({ error: 'Only the host can terminate the session.' }, { status: 403 });
        }
        await deleteDoc(gameDocRef);
        serverAddLog(`Session ${routeSegmentSessionId} terminated by host ${hostId}.`);
        return NextResponse.json({ message: 'Session terminated successfully' });

    } else if (type === 'ADJUST_PLAYER_RESOURCE') {
        const { playerId: targetPlayerId, resourceType, amount } = payload as { playerId: string, resourceType: PlayerResourceType, amount: number };
        const targetPlayerIndex = gameData.players.findIndex(p => p.id === targetPlayerId);
        if (targetPlayerIndex === -1) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        
        if (typeof amount !== 'number' || isNaN(amount)) {
             serverAddLog(`Invalid amount for ADJUST_PLAYER_RESOURCE: ${amount}. Player: ${targetPlayerId}, Resource: ${resourceType}`);
             return NextResponse.json({ error: 'Invalid amount provided. Must be a number.' }, { status: 400 });
        }
        
        const targetPlayer = gameData.players[targetPlayerIndex];
        const oldValue = targetPlayer[resourceType];
        let newValue = oldValue + amount;
        newValue = Math.max(0, newValue); 
        targetPlayer[resourceType] = newValue;
        gameData.players[targetPlayerIndex] = targetPlayer;
        serverAddLog(`${targetPlayer.name}'s ${resourceType} changed by ${amount}. Old: ${oldValue}, New: ${newValue}.`);

    } else if (type === 'ADJUST_GLOBAL_SUSPICION') {
        const { amount } = payload as { amount: number };
        if (typeof amount !== 'number' || isNaN(amount)) { 
             serverAddLog(`Invalid amount for ADJUST_GLOBAL_SUSPICION: ${amount}.`);
             return NextResponse.json({ error: 'Invalid amount provided. Must be a number.' }, { status: 400 });
        }
        const oldSuspicion = gameData.suspicion;
        gameData.suspicion = Math.max(0, gameData.suspicion + amount);
        serverAddLog(`Global suspicion adjusted by ${amount}. Old: ${oldSuspicion}, New: ${gameData.suspicion}.`);

    } else if (type === 'MANUAL_DISCARD_CARD') {
        const { playerId, cardInstanceId, returnToPosition } = payload as { playerId: string; cardInstanceId: string; returnToPosition?: number };
        if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        const cardIndexInHand = player.hand.findIndex(cRef => cRef.instanceId === cardInstanceId);
        if (cardIndexInHand === -1) return NextResponse.json({ error: 'Card not found in hand.' }, { status: 400 });
        
        const discardedCardRef = player.hand.splice(cardIndexInHand, 1)[0];
        const fullDiscardedCard = getFullSecretCardDetailsServer(discardedCardRef);
        gameData.players[playerIndex] = player;

        if (fullDiscardedCard) {
            const zone = gameData.zones.find(z => z.name === fullDiscardedCard.zone);
            if (zone) {
                let position = typeof returnToPosition === 'number' ? Math.max(0, Math.min(returnToPosition, zone.secretDeck.length)) : zone.secretDeck.length;
                zone.secretDeck.splice(position, 0, discardedCardRef);
                serverAddLog(`${player.name} discarded ${fullDiscardedCard.name}. Returned to ${fullDiscardedCard.zone} deck at position ${position}.`);
            } else {
                serverAddLog(`${player.name} discarded ${fullDiscardedCard.name}. Original zone not found, card lost.`);
            }
        }
    } else if (type === 'MANUAL_DISCARD_FROM_MASK') {
        const { playerId, maskTypeToDiscardFrom, returnToPosition } = payload as { playerId: string, maskTypeToDiscardFrom: keyof Player['masks'], returnToPosition?: number };
        if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        const cardRefOnMask = player.masks[maskTypeToDiscardFrom];
        if (!cardRefOnMask) return NextResponse.json({ error: `Mask ${maskTypeToDiscardFrom} is empty.` }, { status: 400 });
        
        const fullCardOnMask = getFullSecretCardDetailsServer(cardRefOnMask);
        player.masks[maskTypeToDiscardFrom] = null;
        gameData.players[playerIndex] = player;

        if (fullCardOnMask) {
            const zone = gameData.zones.find(z => z.name === fullCardOnMask.zone);
            if (zone) {
                let position = typeof returnToPosition === 'number' ? Math.max(0, Math.min(returnToPosition, zone.secretDeck.length)) : zone.secretDeck.length;
                zone.secretDeck.splice(position, 0, cardRefOnMask);
                serverAddLog(`${player.name} discarded ${fullCardOnMask.name} from ${maskTypeToDiscardFrom} mask. Returned to ${fullCardOnMask.zone} deck at position ${position}.`);
            } else {
                serverAddLog(`${player.name} discarded ${fullCardOnMask.name} from ${maskTypeToDiscardFrom} mask. Original zone not found, card lost.`);
            }
        }

    } else if (type === 'MANUAL_RETURN_SECRET_FROM_MASK_TO_HAND') {
        if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        const { maskType } = payload;
        const cardRefOnMask = player.masks[maskType as keyof Player['masks']];
        if (!cardRefOnMask) return NextResponse.json({ error: `No secret on ${maskType} mask.` }, { status: 400 });
        player.hand.push(cardRefOnMask);
        player.masks[maskType as keyof Player['masks']] = null;
        gameData.players[playerIndex] = player;
        serverAddLog(`${player.name} returned ${getFullSecretCardDetailsServer(cardRefOnMask)?.name || 'card'} from ${maskType} mask to hand.`);


    } else if (type === 'GIVE_SECRET_TO_PLAYER') {
        const { givingPlayerId, cardInstanceId, receivingPlayerId } = payload;
        const givingPlayerIdx = gameData.players.findIndex(p => p.id === givingPlayerId);
        const receivingPlayerIdx = gameData.players.findIndex(p => p.id === receivingPlayerId);
        if (givingPlayerIdx === -1 || receivingPlayerIdx === -1) return NextResponse.json({ error: 'Player not found.' }, { status: 404 });
        
        const givingPlayer = gameData.players[givingPlayerIdx];
        const cardIndex = givingPlayer.hand.findIndex(c => c.instanceId === cardInstanceId);
        if (cardIndex === -1) return NextResponse.json({ error: 'Card not found in hand.' }, { status: 400 });
        
        const cardToGiveRef = givingPlayer.hand.splice(cardIndex, 1)[0];
        gameData.players[receivingPlayerIdx].hand.push(cardToGiveRef);
        gameData.players[givingPlayerIdx] = givingPlayer;

        serverAddLog(`${givingPlayer.name} gave ${getFullSecretCardDetailsServer(cardToGiveRef)?.name || 'card'} to ${gameData.players[receivingPlayerIdx].name}.`);


    } else if (type === 'ADJUST_MAX_SUSPICION_PER_TURN') {
        const { amount } = payload as {amount: number};
        if (typeof amount !== 'number' || isNaN(amount)) {
            serverAddLog(`Invalid amount for ADJUST_MAX_SUSPICION_PER_TURN: ${amount}.`);
            return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 });
        }
        gameData.maxSuspicionAdjustment = Math.max(0, (gameData.maxSuspicionAdjustment || 0) + amount);
        serverAddLog(`Max suspicion adjustment per turn changed by ${amount}. New: ${gameData.maxSuspicionAdjustment}.`);


    } else if (type === 'REQUEST_HAND_REVEAL') {
        const { requestingPlayerId, targetPlayerId } = payload;
        const requestingPlayer = gameData.players.find(p => p.id === requestingPlayerId);
        const targetPlayerIdx = gameData.players.findIndex(p => p.id === targetPlayerId);

        if (!requestingPlayer || targetPlayerIdx === -1) return NextResponse.json({ error: 'Player not found.' }, { status: 404 });
        if (gameData.players[targetPlayerIdx].id === requestingPlayerId) return NextResponse.json({error: "Cannot request to see your own hand."}, { status: 400 });

        gameData.players[targetPlayerIdx].pendingHandRevealRequestFrom = { playerId: requestingPlayerId, playerName: requestingPlayer.name };
        serverAddLog(`${requestingPlayer.name} requested to see ${gameData.players[targetPlayerIdx].name}'s hand.`);

    } else if (type === 'RESPOND_TO_HAND_REVEAL') {
        const { confirmingPlayerId, requestingPlayerId, allowed } = payload;
        const confirmingPlayerIdx = gameData.players.findIndex(p => p.id === confirmingPlayerId);
        if (confirmingPlayerIdx === -1) return NextResponse.json({ error: 'Confirming player not found.' }, { status: 404 });
        
        const confirmingPlayer = gameData.players[confirmingPlayerIdx];
        confirmingPlayer.pendingHandRevealRequestFrom = null; 
        if (allowed) {
            gameData.revealedHand = { forPlayerId: requestingPlayerId, targetPlayerName: confirmingPlayer.name, hand: [...confirmingPlayer.hand] };
            serverAddLog(`${confirmingPlayer.name} allowed hand reveal to ${gameData.players.find(p => p.id === requestingPlayerId)?.name || 'Requesting Player'}.`);
        } else {
            serverAddLog(`${confirmingPlayer.name} denied hand reveal to ${gameData.players.find(p => p.id === requestingPlayerId)?.name || 'Requesting Player'}.`);
        }
        gameData.players[confirmingPlayerIdx] = confirmingPlayer;


    } else if (type === 'ACKNOWLEDGE_HAND_REVEAL') {
        if (gameData.revealedHand && gameData.revealedHand.forPlayerId === payload.playerId) {
            gameData.revealedHand = null; 
            serverAddLog(`Player ${payload.playerId} acknowledged revealed hand.`);
        }
    } else if (type === 'REVEAL_VICTORY_CONDITION') {
        if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        if (!player.victoryCondition) return NextResponse.json({ error: 'No Victory Condition to reveal' }, { status: 400 });
        if (player.isVictoryConditionRevealed) return NextResponse.json({ error: 'Victory Condition already revealed' }, { status: 400 });

        player.isVictoryConditionRevealed = true;
        gameData.players[playerIndex] = player;
        serverAddLog(`${player.name} has revealed their Victory Condition: ${player.victoryCondition.name}!`);
    
    } else if (type === 'CONCLUDE_GAME') {
        const { hostPlayerId, winningPlayerId } = payload;
        if (gameData.players.length === 0 || gameData.players[0].id !== hostPlayerId) {
            return NextResponse.json({ error: 'Only the host can conclude the game.' }, { status: 403 });
        }
        const winningPlayer = gameData.players.find(p => p.id === winningPlayerId);
        if (!winningPlayer) {
            return NextResponse.json({ error: 'Selected winning player not found.' }, { status: 404 });
        }

        try {
            await runTransaction(db, async (transaction) => {
                const sanitizedWinnerName = sanitizeFirebaseDocId(winningPlayer.name);
                const playerStatDocRef = doc(db, 'playerStats', sanitizedWinnerName);
                const playerStatSnap = await transaction.get(playerStatDocRef);

                if (!playerStatSnap.exists()) {
                    transaction.set(playerStatDocRef, { playerName: winningPlayer.name, wins: 1 });
                } else {
                    transaction.update(playerStatDocRef, { wins: increment(1) });
                }
                transaction.delete(gameDocRef);
            });
            serverAddLog(`Game concluded by host ${hostPlayerId}. Winner: ${winningPlayer.name}. Session ${routeSegmentSessionId} deleted.`);
            return NextResponse.json({ message: `Game concluded. ${winningPlayer.name} wins! Session deleted.` });
        } catch (e) {
            console.error("[API CONCLUDE_GAME] Error in transaction:", e);
            return NextResponse.json({ error: "Failed to conclude game and update stats.", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
        }
    
    } else if (type === 'REQUEST_DRAW_OFFER') {
        console.log('[API REQUEST_DRAW_OFFER] Processing.');
        if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        if (gameData.turnPhase !== 'Draw' || gameData.currentPlayerId !== player.id) {
            return NextResponse.json({ error: 'Not your turn or not in Draw phase.' }, { status: 403 });
        }
        const playerZone = gameData.zones.find(z => z.name === player.currentZone);
        if (!playerZone || !playerZone.secretDeck) {
             serverAddLog(`Player ${player.name}'s zone or deck data not found.`);
            return NextResponse.json({ error: 'Player zone or deck data not found.' }, { status: 500 });
        }

        const offerCount = Math.min(3, playerZone.secretDeck.length);
        const offeredCardRefs = playerZone.secretDeck.slice(0, offerCount); 
        
        const offeredCardsFullDetails = offeredCardRefs.map(ref => {
            const masterCard = mockSecretCards.find(mc => mc.id === ref.id);
            return masterCard ? { ...masterCard, instanceId: ref.instanceId } : null;
        }).filter(card => card !== null) as SecretCard[];

        return NextResponse.json({ offeredCards: offeredCardsFullDetails });

    } else { 
        if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        if (gameData.turnPhase === 'VC_SELECTION' && gameData.activeEvent?.id === 'VC_SELECTION_PENDING') {
             // Already handled by specific VC actions
        } else if (gameData.currentPlayerId !== player.id) {
            console.log(`[API Block Action] Player: ${player.id}, Phase: ${gameData.turnPhase}, Active Event: ${gameData.activeEvent?.id}, Current Player: ${gameData.currentPlayerId}`);
            return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
        }


        if (type === 'CONFIRM_DRAW') {
            if (gameData.turnPhase !== 'Draw') return NextResponse.json({ error: 'Not in Draw phase' }, { status: 403 });
            const { cardsToTake, cost } = payload as { cardsToTake: StoredSecretCardReference[], cost: number };
            if (player.gold < cost) return NextResponse.json({ error: 'Not enough gold' }, { status: 403 });

            const playerZone = gameData.zones.find(z => z.name === player.currentZone);
            if (!playerZone || !playerZone.secretDeck) return NextResponse.json({ error: 'Player zone or deck data not found.' }, { status: 500 });

            const takenInstanceIds = cardsToTake.map(c => c.instanceId);
            const newZoneDeck = playerZone.secretDeck.filter(ref => !takenInstanceIds.includes(ref.instanceId));
            
            const offeredFromCurrentDeck = playerZone.secretDeck.slice(0, Math.min(3, playerZone.secretDeck.length));
            const validDraw = cardsToTake.every(ct => offeredFromCurrentDeck.some(offeredRef => offeredRef.instanceId === ct.instanceId));

            if(!validDraw){ 
                serverAddLog(`[API CONFIRM_DRAW] Invalid draw selection for ${player.name}. Offered: ${offeredFromCurrentDeck.map(c=>c.instanceId).join(',')}, Taken: ${takenInstanceIds.join(',')}`);
                return NextResponse.json({ error: 'Invalid draw selection or deck state changed.' }, { status: 400 });
            }
            playerZone.secretDeck = newZoneDeck; 

            player.gold -= cost;
            player.hand.push(...cardsToTake); 
            gameData.players[playerIndex] = player;
            
            const zoneIdx = gameData.zones.findIndex(z => z.name === playerZone.name);
            if(zoneIdx !== -1) gameData.zones[zoneIdx] = playerZone;

            gameData.turnPhase = 'Return Exploits';
            serverAddLog(`${player.name} drew ${cardsToTake.length} card(s) from ${playerZone.name}. Gold: ${player.gold}. Now in Return Exploits.`);

        } else if (type === 'SKIP_DRAW') {
            if (gameData.turnPhase !== 'Draw') return NextResponse.json({ error: 'Not in Draw phase' }, { status: 403 });
            gameData.turnPhase = 'Return Exploits';
            serverAddLog(`${player.name} skipped drawing. Now in Return Exploits.`);

        } else if (type === 'RETURN_EXPLOITS') {
            if (gameData.turnPhase !== 'Return Exploits') return NextResponse.json({ error: 'Not in Return Exploits phase' }, { status: 403 });
            
            const masksToReturn: (keyof Player['masks'])[] = ['solar', 'lunar', 'shadow', 'eclipse'];
            masksToReturn.forEach(maskType => {
                if (player.masks[maskType]) {
                    player.hand.push(player.masks[maskType]!); 
                    player.masks[maskType] = null;
                }
            });

            gameData.players[playerIndex] = player;
            gameData.turnPhase = 'Exploit Secrets';
            serverAddLog(`${player.name} returned exploited secrets. Now in Exploit Secrets.`);

        } else if (type === 'EXPLOIT_SECRET') {
            if (gameData.turnPhase !== 'Exploit Secrets') return NextResponse.json({ error: 'Not in Exploit Secrets phase' }, { status: 403 });
            const { cardToExploitRef, targetMaskType } = payload as { cardToExploitRef: StoredSecretCardReference; targetMaskType: keyof Player['masks'] };
            
            const cardInHandIndex = player.hand.findIndex(cRef => cRef.instanceId === cardToExploitRef.instanceId);
            if (cardInHandIndex === -1) return NextResponse.json({ error: 'Card not found in hand.' }, { status: 400 });
            if (player.masks[targetMaskType]) { 
                return NextResponse.json({ error: `Mask ${targetMaskType} is occupied.` }, { status: 400 });
            }
            
            const actualCardRef = player.hand.splice(cardInHandIndex, 1)[0]; 
            player.masks[targetMaskType] = actualCardRef; 
            gameData.players[playerIndex] = player;
            const fullCard = getFullSecretCardDetailsServer(actualCardRef);
            serverAddLog(`${player.name} exploited ${fullCard?.name || 'card'} onto ${targetMaskType}. Effect: ${fullCard?.exploitEffect}`);
        
        } else if (type === 'FINISH_EXPLOITING') {
            if (gameData.turnPhase !== 'Exploit Secrets') return NextResponse.json({ error: 'Not in Exploit Secrets phase.' }, { status: 403 });
            gameData.turnPhase = 'Reveal Secrets';
            gameData.revealedMaskTypesThisTurn = []; 
            gameData.currentlyRevealedMasks = [];
            serverAddLog(`${player.name} finished exploiting. Now in Reveal Secrets.`);

        } else if (type === 'REVEAL_MASK') {
            if (gameData.turnPhase !== 'Reveal Secrets') return NextResponse.json({ error: 'Not in Reveal Secrets phase.' }, { status: 403 });
            const { maskToReveal } = payload as { maskToReveal: keyof Player['masks'] };
            if (maskToReveal === 'eclipse') return NextResponse.json({ error: 'Eclipse mask cannot be revealed.' }, { status: 400 });
            // if (player.information < REVEAL_INFO_COST) return NextResponse.json({ error: `Need ${REVEAL_INFO_COST} Info.` }, { status: 403 }); // Removed cost check

            // player.information -= REVEAL_INFO_COST; // Removed cost deduction
            gameData.players[playerIndex] = player;
            
            gameData.revealedMaskTypesThisTurn = gameData.revealedMaskTypesThisTurn || [];
            if (!gameData.revealedMaskTypesThisTurn.includes(maskToReveal)) {
                gameData.revealedMaskTypesThisTurn.push(maskToReveal);
            }
            
            // Server-side tracking of actually revealed masks for pulsing (owner and type)
            gameData.currentlyRevealedMasks = gameData.currentlyRevealedMasks || [];
            gameData.currentlyRevealedMasks.push({ playerId: player.id, maskType: maskToReveal, revealedByPlayerId: player.id });

            const cardOnMask = player.masks[maskToReveal];
            const fullCardDetails = cardOnMask ? getFullSecretCardDetailsServer(cardOnMask) : null;
            serverAddLog(`${player.name} revealed ${maskToReveal} mask. ${cardOnMask ? `Secret: ${fullCardDetails?.name}. Effect: ${fullCardDetails?.revealEffect}` : 'Empty mask revealed.'}`);
        
        } else if (type === 'FINISH_REVEALING') {
            if (gameData.turnPhase !== 'Reveal Secrets') return NextResponse.json({ error: 'Not in Reveal Secrets phase.' }, { status: 403 });
            
            // Clear server-side tracking of specific masks revealed by THIS player for pulsing
            gameData.currentlyRevealedMasks = (gameData.currentlyRevealedMasks || []).filter(
                m => m.revealedByPlayerId !== player.id 
            );
            // Clear the general "revealed mask types this turn" as the phase ends for this player
            gameData.revealedMaskTypesThisTurn = []; 
            gameData.turnPhase = 'End of Turn';
            serverAddLog(`${player.name} finished revealing. Now in End of Turn.`);

        } else if (type === 'MOVE_PLAYER') {
            if (gameData.turnPhase !== 'End of Turn') return NextResponse.json({ error: 'Not in End of Turn phase.' }, { status: 403 });
            const { targetZoneName } = payload as { targetZoneName: ZoneName };
            const currentZoneData = ZONES_DATA.find(z => z.name === player.currentZone);
            if (!currentZoneData || (player.currentZone !== targetZoneName && !currentZoneData.borders.includes(targetZoneName))) {
                return NextResponse.json({ error: `Cannot move to ${targetZoneName}.` }, { status: 400 });
            }
            player.currentZone = targetZoneName;
            gameData.players[playerIndex] = player;
            serverAddLog(`${player.name} moved to ${targetZoneName}.`);

        } else if (type === 'END_TURN') {
            if (gameData.turnPhase !== 'End of Turn') return NextResponse.json({ error: 'Not in End of Turn phase.' }, { status: 403 });
            
            serverAddLog(`${player.name} ends their turn.`);
            
            // Clear any masks revealed by this player (pulsing) and general revealed types for the next player
            gameData.currentlyRevealedMasks = (gameData.currentlyRevealedMasks || []).filter(
                m => m.revealedByPlayerId !== player.id
            );
            gameData.revealedMaskTypesThisTurn = []; 


            const currentTurnOrderIndex = gameData.turnOrder.indexOf(gameData.currentPlayerId);
            let nextTurnOrderIndex = (currentTurnOrderIndex + 1) % gameData.turnOrder.length;
            const nextPlayerId = gameData.turnOrder[nextTurnOrderIndex];
            gameData.currentPlayerId = nextPlayerId;
            gameData.currentTurnPlayerIndex = gameData.players.findIndex(p => p.id === nextPlayerId);
            gameData.turnPhase = 'Draw';

            if (nextTurnOrderIndex === 0) { 
                gameData.round += 1;
                serverAddLog(`Round ${gameData.round} begins.`);
                
                // Event cycling starts from Round 2 effectively, or if game setup ensures events are pre-loaded
                if (gameData.round > 1 ) { // Only cycle if round > 1
                    gameData.eventDeck = gameData.eventDeck || shuffleArray([...mockEventCards]);
                    if (gameData.activeEvent && gameData.activeEvent.id !== 'VC_SELECTION_PENDING') { 
                         gameData.eventDeck.push(gameData.activeEvent); 
                    }
                    gameData.activeEvent = gameData.upcomingEvent; 
                    gameData.upcomingEvent = gameData.eventDeck.length > 0 ? gameData.eventDeck.shift()! : null; 

                    if(gameData.activeEvent) serverAddLog(`New Active Event for Round ${gameData.round}: ${gameData.activeEvent.name}.`);
                    else serverAddLog(`No Active Event for Round ${gameData.round}.`);
                    if(gameData.upcomingEvent) serverAddLog(`New Upcoming Event for Round ${gameData.round}: ${gameData.upcomingEvent.name}.`);
                    else serverAddLog(`No Upcoming Event for Round ${gameData.round}.`);
                } else { 
                    // Still Round 1
                    serverAddLog(`Round 1 continues: No Active Event.`);
                    if(gameData.upcomingEvent) serverAddLog(`Upcoming Event: ${gameData.upcomingEvent.name}.`);
                }
            }
            serverAddLog(`It is now ${gameData.players[gameData.currentTurnPlayerIndex].name}'s turn (Draw Phase).`);
        } else {
            return NextResponse.json({ error: `Unknown action type: ${type}` }, { status: 400 });
        }
    }

    const gameDataToSave = {
      ...gameData,
      players: gameData.players.map(p => {
        if (p.victoryCondition && typeof (p.victoryCondition as any).isAchieved === 'function') {
          const { isAchieved, ...vcData } = p.victoryCondition as VictoryCondition;
          return { ...p, victoryCondition: vcData as Omit<VictoryCondition, 'isAchieved'> };
        }
        return p;
      }),
    };

    if (newLogEntries.length > 0) {
      gameDataToSave.gameLog = [...newLogEntries.reverse(), ...gameDataToSave.gameLog].slice(0, 50); 
    }

    console.log('[API Action POST] About to update Firestore with gameData:', JSON.stringify(gameDataToSave, null, 2));
    await updateDoc(gameDocRef, gameDataToSave);
    console.log(`[API Action POST] Successfully processed action ${type} for session ${routeSegmentSessionId}.`);

    return NextResponse.json({ ...gameDataToSave, sessionId: routeSegmentSessionId });

  } catch (error) {
    console.error(`[API Action POST] Error processing game action for session ${routeSegmentSessionId}, type ${body?.type}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error && (error as any).details ? (error as any).details : '';
    const responseError = { error: 'Failed to process game action', details: `${errorMessage} ${errorDetails}`.trim() };
    console.error(`[API Action POST] Sending error response:`, responseError)
    return NextResponse.json(responseError, { status: 500 });
  }
}
