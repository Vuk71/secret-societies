
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    ZONE_NAMES, shuffleArray, mockVictoryConditions, mockSecretCards,
    getNextCardInstanceId, ZONES_DATA, mockEventCards, getRandomVictoryConditions,
    MIN_PLAYERS, MAX_PLAYERS, PlayerResourceType,
    StoredSecretCardReference, SecretCard, VictoryCondition as VictoryConditionType, EventCard,
    TurnPhase, DrawStep, ExploitStep, RevealStep, ZoneName, GameState, Player,
} from '@/types/game';
import { PlayerResourcesDisplay } from './PlayerResourcesDisplay';
import { GlobalStateDisplay } from './GlobalStateDisplay';
import { ZoneDisplay } from './ZoneDisplay';
import { HandDisplay, SecretCardTooltipContent } from './HandDisplay';
import { MasksDisplay } from './MasksDisplay';
import { TurnActions } from './TurnActions';
import { OtherPlayersSummary } from './OtherPlayersSummary';
import { GameLogDisplay } from './GameLogDisplay';
import { VictoryConditionDisplay } from './VictoryConditionDisplay';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, ArrowLeft, Users, PlayCircle, Check, X, Trash2, ArchiveRestore, SendIcon, Gift, BookOpen, Eye as EyeIconLucide, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '../icons/Logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose
} from "@/components/ui/dialog";
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


interface GameClientWrapperProps {
  initialSessionId: string;
}

export const getFullCardDetails = (cardRef: StoredSecretCardReference | null): SecretCard | null => {
  if (!cardRef) return null;
  const masterCard = mockSecretCards.find(c => c.id === cardRef.id);
  if (!masterCard) {
    console.warn(`[getFullCardDetails] Master card data not found for ID: ${cardRef.id}`);
    return null;
  }
  return {
    ...masterCard,
    instanceId: cardRef.instanceId
  };
};


export function GameClientWrapper({ initialSessionId }: GameClientWrapperProps) {
  const searchParams = useSearchParams();
  const nextRouter = useRouter();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const gameStateRef = useRef<GameState | null>(null);

  const [thisPlayerId, setThisPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const { toast } = useToast();


  const [manualResourceInputs, setManualResourceInputs] = useState<{ [key in PlayerResourceType | 'suspicion' | 'maxSuspicionAdjustment']?: string }>({});

  const [drawOffer, setDrawOffer] = useState<{ cards: SecretCard[], selectedIndices: number[] } | null>(null);
  const [exploitState, setExploitState] = useState<{ cardToExploit: StoredSecretCardReference | null, targetMaskType: keyof Player['masks'] | null, step: ExploitStep } | null>(null);
  const [revealState, setRevealState] = useState<{ maskToReveal: keyof Player['masks'] | null, step: RevealStep } | null>(null);
  const [revealedMasksThisTurn, setRevealedMasksThisTurn] = useState<Set<keyof Player['masks']>>(new Set());
  const [hasMovedThisTurn, setHasMovedThisTurn] = useState(false);
  const [vcSelectionOffer, setVcSelectionOffer] = useState<{ vcs: Omit<VictoryConditionType, 'isAchieved'>[], selectedVcId: string | null } | null>(null);
  const [isVcDialogTemporarilyHidden, setIsVcDialogTemporarilyHidden] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const [showHandRevealRequestDialog, setShowHandRevealRequestDialog] = useState(false);
  const [handRevealRequester, setHandRevealRequester] = useState<{ playerId: string; playerName: string } | null>(null);
  const [viewingRevealedHand, setViewingRevealedHand] = useState<{ targetPlayerName: string; hand: StoredSecretCardReference[] } | null>(null);

  const [showGiveSecretDialog, setShowGiveSecretDialog] = useState(false);
  const [cardToGive, setCardToGive] = useState<StoredSecretCardReference | null>(null);
  const [recipientForGiveSecret, setRecipientForGiveSecret] = useState<string | null>(null);

  const [showDiscardHandConfirm, setShowDiscardHandConfirm] = useState<{ cardRef: StoredSecretCardReference | null, targetZoneName: ZoneName | null, targetDeckLength: number } | null>(null);
  const [showDiscardMaskConfirm, setShowDiscardMaskConfirm] = useState<{ maskType: keyof Player['masks'] | null, targetZoneName: ZoneName | null, targetDeckLength: number } | null>(null);
  const [discardReturnPosition, setDiscardReturnPosition] = useState<string>("");

  const [showEndGameDialog, setShowEndGameDialog] = useState(false);
  const [potentialWinnerId, setPotentialWinnerId] = useState<string | null>(null);

  const addLog = useCallback((message: string) => {
    const currentSessionId = gameStateRef.current?.sessionId || initialSessionId || 'NO_SESSION_ID_CLIENT_LOG';
    console.log(`[Client Log ${currentSessionId}]: ${message}`);
  }, [initialSessionId]);


  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Main useEffect for fetching initial state and setting up Firestore listener
  useEffect(() => {
    if (!initialSessionId) {
      setInitializationError("No session ID provided. Please return to the homepage.");
      setIsLoading(false);
      return;
    }

    let unsubscribe: Unsubscribe | null = null;

    const initializeAndSubscribe = async () => {
      setIsLoading(true);
      setInitializationError(null);
      addLog(`Initializing game for session ID: ${initialSessionId}`);
      try {
        const response = await fetch(`/api/game/${initialSessionId}`);
        if (!response.ok) {
            let errorData: { error?: string; details?: string } = {};
            try { errorData = await response.json(); } catch (e) { console.error("Failed to parse error response from initial fetch:", e); }
            const errorMessage = errorData.error || `Failed to fetch game state: ${response.status}`;
            addLog(`Error fetching initial game state: ${errorMessage}. Status: ${response.status}`);
            if (response.status === 404 && errorMessage.toLowerCase().includes("not found")) {
                 toast({ title: "Session Not Found", description: `Game session ${initialSessionId} does not exist. Returning to homepage.`, variant: "destructive", duration: 5000 });
                 if (unsubscribe) unsubscribe();
                 setGameState(null); 
                 setTimeout(() => nextRouter.push('/'), 100);
                 return;
            }
            setInitializationError(errorMessage);
            setIsLoading(false);
            return;
        }
        const initialFetchedGameState: GameState = await response.json();
        addLog(`Initial game state fetched for session ${initialFetchedGameState.sessionId}`);

        if (!initialFetchedGameState || !initialFetchedGameState.players) {
            addLog("Fetched game state is invalid or has no players.");
            setInitializationError("Fetched game state is invalid or has no players.");
            setIsLoading(false);
            return;
        }
        
        // Player Identification Logic
        let identifiedPlayerId: string | null = searchParams.get('playerId');
        const queryPlayerName = searchParams.get('playerName'); // Name used to join/create
        const queryIsHost = searchParams.get('isHost') === 'true';

        if (identifiedPlayerId) {
            setThisPlayerId(identifiedPlayerId);
            addLog(`Player identified by playerId query param: ${identifiedPlayerId}`);
            if (initialFetchedGameState.players.length > 0 && initialFetchedGameState.players[0].id === identifiedPlayerId) {
                setIsHost(true);
                addLog(`Player ${identifiedPlayerId} is the host.`);
            }
        } else if (queryPlayerName) {
            // Fallback for hosts who might not have playerId on first load after creation
            const foundPlayer = initialFetchedGameState.players.find(p => p.name === queryPlayerName);
            if (foundPlayer) {
                identifiedPlayerId = foundPlayer.id;
                setThisPlayerId(identifiedPlayerId);
                addLog(`Player identified by playerName query param: ${queryPlayerName} (ID: ${identifiedPlayerId})`);
                if (initialFetchedGameState.players.length > 0 && initialFetchedGameState.players[0].id === identifiedPlayerId) {
                    setIsHost(true);
                    addLog(`Player ${identifiedPlayerId} is the host.`);
                }
            }
        } else {
            addLog(`Could not identify player. Query params - playerId: ${searchParams.get('playerId')}, playerName: ${queryPlayerName}. Game players: ${JSON.stringify(initialFetchedGameState.players.map(p => ({id: p.id, name: p.name})))}`);
            setInitializationError("Could not identify your player in this game session. Please rejoin or ensure correct parameters.");
            setIsLoading(false);
            return;
        }


        // Firestore Snapshot Listener
        const gameDocRef = doc(db, 'gameSessions', initialSessionId);
        unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const updatedGameDataFromSnapshot = docSnap.data() as Omit<GameState, 'sessionId'>;
            const currentLiveGameState: GameState = {
                ...updatedGameDataFromSnapshot,
                sessionId: docSnap.id 
            };
            setGameState(currentLiveGameState);
            addLog(`Game state updated from Firestore snapshot. Phase: ${currentLiveGameState.turnPhase}, CurrentPlayer: ${currentLiveGameState.players.find(p => p.id === currentLiveGameState.currentPlayerId)?.name}, SessionID: ${currentLiveGameState.sessionId}`);

            const localPlayer = currentLiveGameState.players.find(p => p.id === thisPlayerId);
            if (localPlayer?.pendingHandRevealRequestFrom && localPlayer.pendingHandRevealRequestFrom.playerId !== handRevealRequester?.playerId) {
                setHandRevealRequester(localPlayer.pendingHandRevealRequestFrom);
                setShowHandRevealRequestDialog(true);
            } else if (!localPlayer?.pendingHandRevealRequestFrom && showHandRevealRequestDialog) {
                setShowHandRevealRequestDialog(false);
                setHandRevealRequester(null);
            }

            addLog(`Snapshot: thisPlayerId=${thisPlayerId}, revealedHand=${JSON.stringify(currentLiveGameState.revealedHand)}`);
            if (currentLiveGameState.revealedHand?.forPlayerId === thisPlayerId) {
                if (JSON.stringify(viewingRevealedHand?.hand) !== JSON.stringify(currentLiveGameState.revealedHand.hand) || viewingRevealedHand?.targetPlayerName !== currentLiveGameState.revealedHand.targetPlayerName) {
                   setViewingRevealedHand({
                       targetPlayerName: currentLiveGameState.revealedHand.targetPlayerName,
                       hand: [...currentLiveGameState.revealedHand.hand],
                   });
                }
            } else if (viewingRevealedHand && (!currentLiveGameState.revealedHand || currentLiveGameState.revealedHand.forPlayerId !== thisPlayerId)) {
                addLog(`Clearing viewingRevealedHand via snapshot because currentLiveGameState.revealedHand.forPlayerId (${currentLiveGameState.revealedHand?.forPlayerId}) !== thisPlayerId (${thisPlayerId}) or revealedHand is null.`);
                setViewingRevealedHand(null);
            }


            if (initializationError) setInitializationError(null);
          } else {
            addLog("Game document no longer exists in Firestore. Session may have been terminated.");
            if (unsubscribe) { unsubscribe(); unsubscribe = null; }
            setGameState(null);
            toast({ title: "Session Ended", description: "The game session has ended or was deleted. Returning to homepage.", variant: "default", duration: 5000 });
            if (unsubscribe) unsubscribe(); // Ensure unsubscribe is called before navigating
            nextRouter.push('/'); // Using nextRouter from useRouter hook
          }
        }, (error) => {
          console.error("[GameClientWrapper] Error listening to Firestore snapshots:", error);
          toast({ title: "Real-time Update Error", description: "Lost connection to game updates.", variant: "destructive" });
          setInitializationError('Error with real-time game updates.');
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown initialization error.";
        addLog(`Error during initialization: ${errorMessage}`);
        console.error("Error during GameClientWrapper initialization:", error);
        setInitializationError(errorMessage);
        toast({ title: "Error Loading Game", description: errorMessage, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    initializeAndSubscribe();
    return () => {
        if (unsubscribe) {
            addLog("Unsubscribing from Firestore snapshots.");
            unsubscribe();
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId, nextRouter, searchParams, toast, addLog]); // Added addLog

 // Effect for VC Selection Offer
 useEffect(() => {
    const fetchAndSetVcOffer = async () => {
        const gs = gameStateRef.current;
        if (gs && gs.sessionId && thisPlayerId &&
            gs.turnPhase === 'VC_SELECTION' &&
            gs.activeEvent?.id === 'VC_SELECTION_PENDING' && // Ensure game has formally started for VC selection
            gs.currentPlayerId === thisPlayerId &&
            gs.players.find(p => p.id === thisPlayerId)?.victoryCondition === null &&
            !vcSelectionOffer && !isLoading && !isSubmittingAction) {

            addLog(`Player ${thisPlayerId} (you) requesting VC offer for session ${gs.sessionId}.`);
            const result = await handleApiAction('GET_VC_OFFER', { playerId: thisPlayerId });
            if (result?.success && result.data?.offeredVCs) {
                const data = result.data as { offeredVCs: Omit<VictoryConditionType, 'isAchieved'>[] };
                addLog(`VC offer received: ${data.offeredVCs.map((vc: any) => vc.name).join(', ')}`);
                setVcSelectionOffer({ vcs: data.offeredVCs, selectedVcId: null });
                setIsVcDialogTemporarilyHidden(false);
            } else if (result && !result.success) {
                toast({ title: "VC Offer Error", description: result.error || "Could not fetch Victory Condition options.", variant: "destructive" });
            }
        }
    };
    fetchAndSetVcOffer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, thisPlayerId, vcSelectionOffer, isLoading, isSubmittingAction, addLog]);


  // Effect for clearing revealed masks this turn when phase/player changes
  useEffect(() => {
    const gs = gameStateRef.current;
    if (!gs || !thisPlayerId) return;

    // Clear revealedMasksThisTurn (client-side tracker for current player's current Reveal phase)
    if (gs.turnPhase !== 'Reveal Secrets' || gs.currentPlayerId !== thisPlayerId) {
      if (revealedMasksThisTurn.size > 0) {
        addLog(`Clearing client-side revealedMasksThisTurn set due to phase/player change for ${thisPlayerId}. Old phase: ${gs.turnPhase}, Old player: ${gs.currentPlayerId}`);
        setRevealedMasksThisTurn(new Set());
      }
    }
    // Clear hasMovedThisTurn if not in End of Turn phase
    if (gs.turnPhase !== 'End of Turn' && hasMovedThisTurn) {
      setHasMovedThisTurn(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.turnPhase, gameState?.currentPlayerId, thisPlayerId, addLog]);


  const handleApiAction = async (type: string, payload: object & { playerId?: string }) => {
    const currentSessionId = gameStateRef.current?.sessionId;
    if (!currentSessionId) {
      toast({ title: "Action Error", description: "Session ID missing. Cannot perform action.", variant: "destructive" });
      addLog(`API Action ${type} failed: Session ID missing. Current gameState: ${JSON.stringify(gameStateRef.current)}`);
      return { success: false, error: "Session ID missing" };
    }

    const finalPayload = { ...payload, playerId: payload.playerId || thisPlayerId };
    addLog(`Sending API action ${type} for session ${currentSessionId}. Player: ${finalPayload.playerId}. Payload: ${JSON.stringify(finalPayload)}`);

    if (type !== 'ACKNOWLEDGE_HAND_REVEAL' && type !== 'GET_VC_OFFER' && type !== 'REQUEST_DRAW_OFFER') {
        setIsSubmittingAction(true);
    }

    try {
      const response = await fetch(`/api/game/${currentSessionId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload: finalPayload }),
      });

      if (!response.ok) {
        let errorData: { error?: string; details?: string } = { error: `Server error ${response.status}`};
        try {
          errorData = await response.json();
        } catch (e) {
            const responseText = await response.text().catch(() => 'Could not read response text.');
            console.error(`Non-JSON error response for ${type}: Status ${response.status}. Response text: ${responseText}`, e);
            throw new Error(`Server returned status ${response.status} but response was not valid JSON.`);
        }
        console.error(`Error response from server for ${type}:`, errorData);
        const clientErrorMessage = (typeof errorData === 'object' && errorData !== null && 'error' in errorData && typeof errorData.error === 'string')
                                    ? errorData.error + (errorData.details ? ` Details: ${errorData.details}` : "")
                                    : `Server error ${response.status}. Check server logs for session ${currentSessionId}.`;
        throw new Error(clientErrorMessage);
      }
      addLog(`API action ${type} successful (state will update via onSnapshot).`);
      if (type === 'GET_VC_OFFER' || type === 'REQUEST_DRAW_OFFER') {
        const data = await response.json();
        return { success: true, data };
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Unknown error occurred during ${type}.`;
      toast({ title: `Error: ${type}`, description: errorMessage, variant: "destructive" });
      addLog(`Error in API action ${type}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
       if (type !== 'ACKNOWLEDGE_HAND_REVEAL' && type !== 'GET_VC_OFFER' && type !== 'REQUEST_DRAW_OFFER') {
        setIsSubmittingAction(false);
      }
    }
  };

  const handleStartGameFromLobby = async () => {
    const gs = gameStateRef.current;
    const currentSessionId = gs?.sessionId;
    if (!gs || !thisPlayerId || !isHost || !currentSessionId) {
        addLog(`handleStartGameFromLobby: Blocked. gs: ${!!gs}, thisPlayerId: ${thisPlayerId}, isHost: ${isHost}, sessionId: ${currentSessionId}`);
        return;
    }
    addLog(`handleStartGameFromLobby: Host ${thisPlayerId} attempting to start game for session ${currentSessionId}.`);
    await handleApiAction('START_GAME_FROM_LOBBY', { playerId: thisPlayerId });
  };

  const handleVCSelect = async (vcId: string) => {
    const gs = gameStateRef.current;
    const currentSessionId = gs?.sessionId;

    if (!gs || !thisPlayerId || !vcSelectionOffer || !currentSessionId) {
        addLog(`VC Select blocked. gs: ${!!gs}, thisPlayerId: ${!!thisPlayerId}, vcSelectionOffer: ${!!vcSelectionOffer}, sessionId: ${currentSessionId}`);
        toast({ title: "Selection Error", description: "Cannot select Victory Condition at this time.", variant: "destructive" });
        return;
    }
    const selectedVC = vcSelectionOffer.vcs.find(v => v.id === vcId);
    if (!selectedVC) {
        toast({ title: "Victory Condition Selection Error", description: "Invalid VC chosen.", variant: "destructive" });
        return;
    }
    const payload = { playerId: thisPlayerId, vcId };
    addLog(`Player ${thisPlayerId} attempts to select Victory Condition: ${selectedVC.name} for session ${currentSessionId}. Payload: ${JSON.stringify(payload)}`);

    const result = await handleApiAction('SELECT_VC', payload);
    if (result?.success) {
      toast({ title: "Victory Condition Selected!", description: `You chose: ${selectedVC.name}` });
      setVcSelectionOffer(null);
      setIsVcDialogTemporarilyHidden(false);
    }
  };

  const handleTerminateSession = async () => {
    const gs = gameStateRef.current;
    if (!gs || !thisPlayerId || !isHost || !gs.sessionId) return;
    addLog(`Player ${thisPlayerId} (host) is terminating session ${gs.sessionId}.`);
    await handleApiAction('TERMINATE_SESSION', { playerId: thisPlayerId });
    // Client will be redirected via onSnapshot when document is deleted
  };

  const currentPlayer = gameState?.players.find(p => p.id === thisPlayerId);
  const actualCurrentTurnPlayer = gameState?.players.find(p => p.id === gameState?.currentPlayerId);
  const vcSelectingPlayer = gameState?.turnPhase === 'VC_SELECTION' && gameState.activeEvent?.id === 'VC_SELECTION_PENDING' && gameState.vcSelectionPlayerIndex !== undefined && gameState.players.length > gameState.vcSelectionPlayerIndex
                            ? gameState.players[gameState.vcSelectionPlayerIndex]
                            : null;


  const handleDraw = async () => {
    const gs = gameStateRef.current;
    if (!gs || !currentPlayer || gs.turnPhase !== 'Draw' || gs.currentPlayerId !== thisPlayerId || drawOffer) return;
    addLog(`${currentPlayer.name} requesting draw offer for session ${gs.sessionId}. Zone: ${currentPlayer.currentZone}`);
    const result = await handleApiAction('REQUEST_DRAW_OFFER', { playerId: thisPlayerId });
    if (result?.success && result.data?.offeredCards) {
      const offeredCards = result.data.offeredCards as SecretCard[];
      if (offeredCards.length === 0) {
          toast({ title: "No Secrets Here", description: `No secrets left in ${currentPlayer.currentZone}. You may skip drawing.`});
      }
      setDrawOffer({ cards: offeredCards, selectedIndices: [] });
    }
  };

  const handleDrawSelectionChange = (index: number, checked: boolean) => {
    if (!drawOffer) return;
    let newSelectedIndices = [...drawOffer.selectedIndices];
    if (checked) newSelectedIndices.push(index);
    else newSelectedIndices = newSelectedIndices.filter(i => i !== index);
    setDrawOffer({ ...drawOffer, selectedIndices: newSelectedIndices });
  };

  const confirmDrawSelection = async () => {
    const gs = gameStateRef.current;
    if (!drawOffer || !gs || !currentPlayer || !thisPlayerId) return;

    const freeCardsCount = 1;
    const extraCardCost = 3;
    const cardsToTakeFull = drawOffer.selectedIndices.map(i => drawOffer.cards[i]);
    const cost = Math.max(0, cardsToTakeFull.length - freeCardsCount) * extraCardCost;

    const parsedGold = currentPlayer.gold;
    if (typeof parsedGold !== 'number' || isNaN(parsedGold) || parsedGold < cost) {
      toast({ title: "Not enough gold!", description: `Need ${cost} gold, have ${currentPlayer.gold}.`, variant: "destructive" });
      return;
    }

    if (drawOffer.cards.length > 0 && cardsToTakeFull.length === 0) {
      await skipDrawAndProceed(); return;
    }
    if (drawOffer.cards.length === 0 ) {
      await skipDrawAndProceed(); return;
    }

    const cardsToTakeRefs: StoredSecretCardReference[] = cardsToTakeFull.map(c => ({ id: c.id, instanceId: c.instanceId }));
    addLog(`Confirming draw for ${thisPlayerId} in session ${gs.sessionId}: ${cardsToTakeRefs.length} cards, cost ${cost}. Cards: ${cardsToTakeRefs.map(c => c.instanceId).join(', ')}`);
    const result = await handleApiAction('CONFIRM_DRAW', { playerId: thisPlayerId, cardsToTake: cardsToTakeRefs, cost });
    if (result?.success) {
      toast({ title: "Draw Confirmed", description: "Cards added to hand."});
      setDrawOffer(null);
    }
  };

  const skipDrawAndProceed = async () => {
    const gs = gameStateRef.current;
    if (!gs || !currentPlayer || !thisPlayerId || gs.turnPhase !== 'Draw' || gs.currentPlayerId !== thisPlayerId) return;
    addLog(`Player ${thisPlayerId} skipping draw in session ${gs.sessionId}.`);
    const result = await handleApiAction('SKIP_DRAW', { playerId: thisPlayerId });
    if (result?.success) {
      toast({ title: "Draw Skipped", description: "Proceeding."});
      setDrawOffer(null);
    }
  };

  const handleReturnExploits = async () => {
    const gs = gameStateRef.current;
    if (!gs || !currentPlayer || !thisPlayerId || gs.turnPhase !== 'Return Exploits' || gs.currentPlayerId !== thisPlayerId) return;
    addLog(`Player ${thisPlayerId} returning exploits in session ${gs.sessionId}.`);
    await handleApiAction('RETURN_EXPLOITS', { playerId: thisPlayerId });
  };

  const startExploitPhaseAction = () => {
    const gs = gameStateRef.current;
    if (!gs || !currentPlayer || gs.currentPlayerId !== thisPlayerId || exploitState || gs.turnPhase !== 'Exploit Secrets') return;
    if (currentPlayer.hand.length === 0) { toast({ title: "No Cards to Exploit", variant: "destructive"}); return; }

    const availableMasks = (Object.keys(currentPlayer.masks) as Array<keyof Player['masks']>)
        .filter(mt => currentPlayer.masks[mt] === null ); 

    if (availableMasks.length === 0 ) { 
         toast({ title: "No Masks Available", description: "All mask slots are occupied.", variant: "destructive"});
         return;
    }

    setExploitState({ cardToExploit: null, targetMaskType: null, step: 'selectCard' });
    toast({ title: "Exploit Secrets", description: "Select a card from your hand to exploit." });
  };

  const cancelExploitCardSelection = () => { setExploitState(null); toast({ title: "Exploit Cancelled" }); };
  const goBackToExploitCardSelection = () => setExploitState(prev => prev ? ({ ...prev, step: 'selectCard', cardToExploit: null, targetMaskType: null }) : null);
  const cancelExploitMaskSelectionAndFullAttempt = () => { setExploitState(null); toast({ title: "Exploit Cancelled" }); };

  const handleCardSelectForExploit = (cardRef: StoredSecretCardReference) => {
    if (!exploitState || exploitState.step !== 'selectCard') return;
    const fullCard = getFullCardDetails(cardRef);
    setExploitState({ ...exploitState, cardToExploit: cardRef, step: 'selectMask' });
    toast({ title: "Card Selected", description: `Selected ${fullCard?.name || 'card'}. Now select an available mask.` });
  };

  const handleMaskSelectForExploit = async (maskType: keyof Player['masks']) => {
    const gs = gameStateRef.current;
    if (!exploitState || !exploitState.cardToExploit || !thisPlayerId || !gs || !currentPlayer) return;

    if (currentPlayer.masks[maskType]) {
        toast({ title: "Mask Occupied", description: `Mask ${maskType} already has a secret.`, variant: "destructive"});
        return;
    }

    const cardToExploitRef = exploitState.cardToExploit;
    const fullCard = getFullCardDetails(cardToExploitRef);
    addLog(`Player ${thisPlayerId} exploiting ${fullCard?.name || cardToExploitRef.id} onto ${maskType} in session ${gs.sessionId}.`);
    const result = await handleApiAction('EXPLOIT_SECRET', { playerId: thisPlayerId, cardToExploitRef, targetMaskType: maskType });

    if (result?.success) {
      toast({ title: "Secret Exploited!", description: `${fullCard?.name || 'Card'} placed on ${maskType}.` });
      const liveGameState = gameStateRef.current; // Get potentially updated state
      const updatedPlayerAfterServer = liveGameState?.players.find(p => p.id === thisPlayerId);
      
      let hasMoreCards = false;
      if (updatedPlayerAfterServer) {
         const handAfterExploit = updatedPlayerAfterServer.hand.filter(hCard => hCard.instanceId !== cardToExploitRef.instanceId);
         hasMoreCards = handAfterExploit.length > 0;
      }

      const availableMasksAfterExploit = updatedPlayerAfterServer ?
                                          (Object.keys(updatedPlayerAfterServer.masks) as Array<keyof Player['masks']>)
                                          .filter(mt => updatedPlayerAfterServer.masks[mt] === null)
                                          : [];
      const hasMoreMasks = availableMasksAfterExploit.length > 0;

      if (hasMoreCards && hasMoreMasks) {
        setExploitState({ cardToExploit: null, targetMaskType: null, step: 'selectCard' }); // Ready for another exploit
        toast({title: "Exploit More?", description: "You can exploit another secret."});
      } else {
        setExploitState(null); // No more exploits possible, clear state
        toast({ title: "No More Exploits Possible", description: "No more cards to exploit or masks available. Click 'Finish Exploiting'.", duration: 4000});
      }
    }
  };


  const handleFinishExploitingPhase = async () => {
    const gs = gameStateRef.current;
    if (!gs || !thisPlayerId || gs.turnPhase !== 'Exploit Secrets') return;
    addLog(`Player ${thisPlayerId} finishing exploiting in session ${gs.sessionId}.`);
    const result = await handleApiAction('FINISH_EXPLOITING', { playerId: thisPlayerId });
    if (result?.success) {
        setExploitState(null);
    }
  };

  const startRevealPhaseAction = () => {
    const gs = gameStateRef.current;
    if (!gs || !currentPlayer || gs.currentPlayerId !== thisPlayerId || revealState || gs.turnPhase !== 'Reveal Secrets') return;
    
    setRevealedMasksThisTurn(new Set()); // Clear for this new reveal phase instance
    setRevealState({ maskToReveal: null, step: 'selectMask' });
    toast({ title: "Reveal Secrets", description: `Select a non-Eclipse mask to reveal. Even empty masks can be revealed.` });
  };

  const cancelRevealSelection = () => { setRevealState(null); toast({ title: "Reveal Cancelled" }); };

  const handleMaskSelectForReveal = async (maskType: keyof Player['masks']) => {
    const gs = gameStateRef.current;
    if (!revealState || !currentPlayer || !thisPlayerId || !gs) return;
    if (maskType === 'eclipse') { toast({ title: "Invalid Mask", description: "Eclipse mask cannot be revealed this way.", variant: "destructive" }); return; }

    if (revealedMasksThisTurn.has(maskType)) {
        toast({ title: "Already Revealed", description: `You have already revealed the ${maskType} mask this turn.`, variant: "destructive" });
        return;
    }
    
    addLog(`Player ${thisPlayerId} revealing ${maskType} in session ${gs.sessionId}.`);
    const result = await handleApiAction('REVEAL_MASK', { playerId: thisPlayerId, maskToReveal: maskType });
    if (result?.success) {
      toast({ title: "Mask Reveal Sent!", description: `Revelation of ${maskType} mask processed.` });
      setRevealedMasksThisTurn(prev => new Set(prev).add(maskType));

      const liveGameState = gameStateRef.current; // Get potentially updated state
      const updatedPlayerAfterServer = liveGameState?.players.find(p => p.id === thisPlayerId);

      if (updatedPlayerAfterServer) {
         setRevealState({ maskToReveal: null, step: 'selectMask' }); // Return to selection mode
         toast({ title: "Reveal Processed", description: "You may reveal another mask or finish."});
      } else {
        setRevealState(null); // Should not happen, but clear state
        toast({ title: "Reveal Processed", description: "State error. Click 'Finish Revealing'.", variant: "destructive"});
      }
    }
  };


  const handleFinishRevealingPhase = async () => {
    const gs = gameStateRef.current;
    if (!gs || !thisPlayerId || gs.turnPhase !== 'Reveal Secrets') return;
    addLog(`Player ${thisPlayerId} finishing revealing in session ${gs.sessionId}.`);
    const result = await handleApiAction('FINISH_REVEALING', { playerId: thisPlayerId });
    if (result?.success) {
        setRevealState(null);
    }
  };

  const handleZoneSelect = async (zoneName: ZoneName) => {
    const gs = gameStateRef.current;
    if (!gs || !currentPlayer || !actualCurrentTurnPlayer || actualCurrentTurnPlayer.id !== thisPlayerId || gs.turnPhase !== 'End of Turn') {
      toast({ title: "Cannot Move", description: "Not in End of Turn phase or not your turn.", variant: "destructive" }); return;
    }
    if (hasMovedThisTurn) {
      toast({ title: "Already Moved", description: "You can only move once per turn.", variant: "destructive" }); return;
    }
    const masterZoneData = ZONES_DATA.find(z => z.name === currentPlayer.currentZone);
    if (!masterZoneData || (currentPlayer.currentZone !== zoneName && !masterZoneData.borders.includes(zoneName))) {
      toast({ title: "Invalid Move", description: "Cannot move to a non-bordering zone.", variant: "destructive" }); return;
    }
    addLog(`Player ${thisPlayerId} moving to ${zoneName} in session ${gs.sessionId}.`);
    const result = await handleApiAction('MOVE_PLAYER', { playerId: thisPlayerId, targetZoneName: zoneName });
    if (result?.success) setHasMovedThisTurn(true);
  };

  const handleEndTurn = async () => {
    const gs = gameStateRef.current;
    if (!gs || !thisPlayerId || gs.currentPlayerId !== thisPlayerId || gs.turnPhase !== 'End of Turn') return;
    addLog(`Player ${thisPlayerId} ending turn in session ${gs.sessionId}.`);
    const result = await handleApiAction('END_TURN', { playerId: thisPlayerId });
    if (result?.success) setHasMovedThisTurn(false);
  };

  const handleProceedToNextPhase = () => {
    const gs = gameStateRef.current;
    if (!gs || !currentPlayer || !thisPlayerId) return;
    if (gs.currentPlayerId !== thisPlayerId) return;

    if (drawOffer) { confirmDrawSelection(); return; }
    if (exploitState?.step === 'selectCard' || exploitState?.step === 'selectMask') { handleFinishExploitingPhase(); return; }
    if (revealState?.step === 'selectMask') { handleFinishRevealingPhase(); return; }

    switch (gs.turnPhase) {
      case 'Draw': skipDrawAndProceed(); break;
      case 'Return Exploits': handleReturnExploits(); break;
      case 'Exploit Secrets': handleFinishExploitingPhase(); break;
      case 'Reveal Secrets': handleFinishRevealingPhase(); break;
      case 'End of Turn': handleEndTurn(); break;
      default: addLog(`Cannot proceed from phase: ${gs.turnPhase} in session ${gs.sessionId}`);
    }
  };

  const handleManualResourceInputChange = (resource: PlayerResourceType | 'suspicion' | 'maxSuspicionAdjustment', value: string) => setManualResourceInputs(prev => ({ ...prev, [resource]: value }));

  const handleAdjustPlayerResource = async (targetPlayerId: string, resourceType: PlayerResourceType) => {
    if (!thisPlayerId || !gameStateRef.current?.sessionId) return;
    const amountStr = manualResourceInputs[resourceType] || "0";
    const amount = parseInt(amountStr, 10);

    if (isNaN(amount)) {
      toast({ title: "Invalid Amount", description: "Amount must be a number.", variant: "destructive" });
      return;
    }

    await handleApiAction('ADJUST_PLAYER_RESOURCE', { playerId: targetPlayerId, resourceType, amount });
    setManualResourceInputs(prev => ({ ...prev, [resourceType]: "" }));
  };
  const handleAdjustGlobalSuspicion = async () => {
    if (!gameStateRef.current?.sessionId) return;
    const amountStr = manualResourceInputs.suspicion || "0";
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount)) {
      toast({ title: "Invalid Amount", description: "Amount must be a number.", variant: "destructive" });
      return;
    }
    await handleApiAction('ADJUST_GLOBAL_SUSPICION', { amount });
    setManualResourceInputs(prev => ({ ...prev, suspicion: "" }));
  };

  const handleAdjustMaxSuspicionPerTurn = async () => {
    if (!gameStateRef.current?.sessionId || !thisPlayerId) return;
    const amountStr = manualResourceInputs.maxSuspicionAdjustment || "0";
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount)) {
      toast({ title: "Invalid Amount", description: "Amount must be a number.", variant: "destructive" });
      return;
    }
    await handleApiAction('ADJUST_MAX_SUSPICION_PER_TURN', { amount });
    setManualResourceInputs(prev => ({ ...prev, maxSuspicionAdjustment: "" }));
  };

  const handleManualDiscardPrompt = (cardRef: StoredSecretCardReference) => {
    const gs = gameStateRef.current;
    if (!gs) return;
    const fullCard = getFullCardDetails(cardRef);
    if (!fullCard) {
      toast({ title: "Error", description: "Card details not found.", variant: "destructive" });
      return;
    }
    const zone = gs.zones.find(z => z.name === fullCard.zone);
    setShowDiscardHandConfirm({
        cardRef,
        targetZoneName: fullCard.zone,
        targetDeckLength: zone ? zone.secretDeck.length : 0
    });
    setDiscardReturnPosition("");
  }
  const confirmDiscardHand = async () => {
    if (!showDiscardHandConfirm?.cardRef || !thisPlayerId || !gameStateRef.current?.sessionId) return;
    const position = discardReturnPosition === "" ? undefined : parseInt(discardReturnPosition, 10);
    if (discardReturnPosition !== "" && (isNaN(position) || position < 0)) {
        toast({ title: "Invalid Position", description: "Position must be a non-negative number or empty for bottom.", variant: "destructive"});
        return;
    }
    await handleApiAction('MANUAL_DISCARD_CARD', {
      playerId: thisPlayerId,
      cardInstanceId: showDiscardHandConfirm.cardRef.instanceId,
      returnToPosition: position
    });
    setShowDiscardHandConfirm(null);
    setDiscardReturnPosition("");
  };
  const cancelDiscardHand = () => {
    setShowDiscardHandConfirm(null);
    setDiscardReturnPosition("");
  }

  const handleManualDiscardFromMaskPrompt = (maskType: keyof Player['masks']) => {
    const gs = gameStateRef.current;
    if (!gs || !currentPlayer) return;
    const cardRefOnMask = currentPlayer.masks[maskType];
    if (!cardRefOnMask) { toast({ title: "Mask Empty", description: "No secret to discard from this mask.", variant: "destructive" }); return; }

    const fullCard = getFullCardDetails(cardRefOnMask);
    if (!fullCard) {
      toast({ title: "Error", description: "Card details not found for mask secret.", variant: "destructive" });
      return;
    }
    const zone = gs.zones.find(z => z.name === fullCard.zone);
    setShowDiscardMaskConfirm({
        maskType,
        targetZoneName: fullCard.zone,
        targetDeckLength: zone ? zone.secretDeck.length : 0
    });
    setDiscardReturnPosition("");
  };
  const confirmDiscardMask = async () => {
    if (!showDiscardMaskConfirm?.maskType || !thisPlayerId || !gameStateRef.current?.sessionId) return;
    const position = discardReturnPosition === "" ? undefined : parseInt(discardReturnPosition, 10);
     if (discardReturnPosition !== "" && (isNaN(position) || position < 0)) {
        toast({ title: "Invalid Position", description: "Position must be a non-negative number or empty for bottom.", variant: "destructive"});
        return;
    }
    await handleApiAction('MANUAL_DISCARD_FROM_MASK', {
        playerId: thisPlayerId,
        maskTypeToDiscardFrom: showDiscardMaskConfirm.maskType,
        returnToPosition: position
    });
    setShowDiscardMaskConfirm(null);
    setDiscardReturnPosition("");
  };
  const cancelDiscardMask = () => {
    setShowDiscardMaskConfirm(null);
    setDiscardReturnPosition("");
  }

  const handleManualReturnSecretFromMaskToHand = async (maskType: keyof Player['masks']) => {
    if (!currentPlayer?.masks[maskType]) { toast({ title: "Mask Empty", description: "No secret to return from this mask.", variant: "destructive" }); return; }
    if (!thisPlayerId || !gameStateRef.current?.sessionId) return;
    await handleApiAction('MANUAL_RETURN_SECRET_FROM_MASK_TO_HAND', { playerId: thisPlayerId, maskType });
  };

  const handleOpenGiveSecretDialog = (cardRef: StoredSecretCardReference) => {
    const gs = gameStateRef.current;
    if (!gs || gs.players.length <= 1) { toast({ title: "No one to give to.", description: "You are the only player or no other players available.", variant: "destructive" }); return; }
    setCardToGive(cardRef); setShowGiveSecretDialog(true);
  };
  const handleCloseGiveSecretDialog = () => { setShowGiveSecretDialog(false); setCardToGive(null); setRecipientForGiveSecret(null); };
  const handleConfirmGiveSecret = async () => {
    const gs = gameStateRef.current;
    if (!thisPlayerId || !cardToGive || !recipientForGiveSecret || !gs?.sessionId) { toast({ title: "Error", description: "Card or recipient missing for giving secret.", variant: "destructive" }); return; }
    await handleApiAction('GIVE_SECRET_TO_PLAYER', { givingPlayerId: thisPlayerId, cardInstanceId: cardToGive.instanceId, receivingPlayerId: recipientForGiveSecret });
    handleCloseGiveSecretDialog();
  };

  const handleRequestHandReveal = async (targetPlayerId: string) => {
    const gs = gameStateRef.current;
    if (!thisPlayerId || !gs?.sessionId) return;
    addLog(`Player ${thisPlayerId} requesting hand reveal from ${targetPlayerId} in session ${gs.sessionId}`);
    const result = await handleApiAction('REQUEST_HAND_REVEAL', { requestingPlayerId: thisPlayerId, targetPlayerId });
    if (result?.success) toast({ title: "Hand Reveal Request Sent", description: "Waiting for player's response."});
  };
  const handleRespondToHandReveal = async (allowed: boolean) => {
    const gs = gameStateRef.current;
    if (!thisPlayerId || !handRevealRequester || !gs?.sessionId) return;
    addLog(`Player ${thisPlayerId} responding to hand reveal request from ${handRevealRequester.playerName}. Allowed: ${allowed}`);
    await handleApiAction('RESPOND_TO_HAND_REVEAL', { confirmingPlayerId: thisPlayerId, requestingPlayerId: handRevealRequester.playerId, allowed });
    setShowHandRevealRequestDialog(false); setHandRevealRequester(null);
  };

  const handleAcknowledgeHandReveal = async () => {
    const playerID = thisPlayerId;
    addLog(`Player ${playerID} acknowledging revealed hand. Current viewingRevealedHand: ${JSON.stringify(viewingRevealedHand)}`);
    if (playerID && gameStateRef.current?.sessionId && viewingRevealedHand ) {
        await handleApiAction('ACKNOWLEDGE_HAND_REVEAL', { playerId: playerID });
    }
    setViewingRevealedHand(null); 
  };

  const handleRevealVictoryCondition = async () => {
    const gs = gameStateRef.current;
    if (!gs || !thisPlayerId || !currentPlayer || !currentPlayer.victoryCondition || currentPlayer.isVictoryConditionRevealed) {
        toast({title: "Cannot Reveal Victory Condition", description: "No Victory Condition to reveal or already revealed.", variant: "destructive"});
        return;
    }
    addLog(`Player ${thisPlayerId} revealing Victory Condition: ${currentPlayer.victoryCondition.name}`);
    await handleApiAction('REVEAL_VICTORY_CONDITION', { playerId: thisPlayerId });
  };

  const handleEndGamePrompt = () => {
    const gs = gameStateRef.current;
    if (!isHost || !gs || !gs.players.some(p => p.isVictoryConditionRevealed)) return;
    setPotentialWinnerId(null);
    setShowEndGameDialog(true);
  };

  const handleConfirmEndGame = async () => {
    const gs = gameStateRef.current;
    if (!isHost || !potentialWinnerId || !gs || !thisPlayerId) {
        toast({title: "Error", description: "Winner must be selected.", variant: "destructive"});
        return;
    }
    addLog(`Host ${thisPlayerId} concluding game. Declared winner: ${potentialWinnerId}`);
    const result = await handleApiAction('CONCLUDE_GAME', { hostPlayerId: thisPlayerId, winningPlayerId: potentialWinnerId });
    if (result?.success) {
        const winner = gs.players.find(p => p.id === potentialWinnerId);
        toast({title: "Game Concluded!", description: `${winner?.name || 'Selected player'} is victorious! Session will be removed.`});
        setShowEndGameDialog(false);
    }
  };


  const getProceedButtonTextAndState = (): { text: string, canProceed: boolean } => {
    const gs = gameStateRef.current;
    if (!gs) return { text: "Proceed", canProceed: false };
    if (gs.turnPhase === 'VC_SELECTION' && gs.activeEvent?.id !== 'VC_SELECTION_PENDING') return { text: "Proceed", canProceed: false }; // Should be in lobby
    if (gs.turnPhase === 'VC_SELECTION' && gs.activeEvent?.id === 'VC_SELECTION_PENDING' && vcSelectionOffer) return { text: "Confirm VC (Dialog)", canProceed: false };
    
    if (drawOffer) return { text: "Confirm Draw (Dialog)", canProceed: false };
    if (exploitState?.step === 'selectCard' || exploitState?.step === 'selectMask') return { text: "Finish Exploiting", canProceed: true };
    if (revealState?.step === 'selectMask') return { text: "Finish Revealing", canProceed: true };

    switch (gs.turnPhase) {
      case 'Draw': return { text: "Skip Draw / To Return", canProceed: true };
      case 'Return Exploits': return { text: "To Exploit Secrets", canProceed: true };
      case 'Exploit Secrets': return { text: "Finish Exploiting / To Reveal", canProceed: true };
      case 'Reveal Secrets': return { text: "Finish Revealing / To End Turn", canProceed: true };
      case 'End of Turn': return { text: "End Turn", canProceed: true };
      default: return { text: "Proceed", canProceed: false };
    }
  };

  const canPerformAction = (phase: TurnPhase): boolean => {
    const gs = gameStateRef.current;
    if (!gs || !currentPlayer || isSubmittingAction) return false;
    
    // If in VC selection phase, no other actions should be performable by players not selecting
    if (gs.turnPhase === 'VC_SELECTION' && gs.activeEvent?.id === 'VC_SELECTION_PENDING') {
      if (gs.currentPlayerId !== thisPlayerId) return false; // Only current selector can act (which is handled by VC dialog)
    } else if (actualCurrentTurnPlayer?.id !== thisPlayerId ) return false; // General turn check

    if (vcSelectionOffer) return false; // Block other actions if VC offer is up

    if (drawOffer) return phase === 'Draw';
    if (exploitState?.step === 'selectMask') return false;
    if (exploitState?.step === 'selectCard') return phase === 'Exploit Secrets';
    if (revealState?.step === 'selectMask') return phase === 'Reveal Secrets';

    return gs.turnPhase === phase;
  };

  const isExploitingCard = exploitState?.step === 'selectCard';
  const isExploitingMask = exploitState?.step === 'selectMask';
  const isRevealingMask = revealState?.step === 'selectMask';


  const disableMainButtons = !!drawOffer ||
                             isExploitingCard || isExploitingMask ||
                             isRevealingMask ||
                             isSubmittingAction;

  const { text: proceedButtonText, canProceed: proceedEnabled } = getProceedButtonTextAndState();
  const playerHasVc = !!gameState?.players.find(p => p.id === thisPlayerId)?.victoryCondition;

  const showLobbyView = gameState?.turnPhase === 'VC_SELECTION' && (!gameState.activeEvent || gameState.activeEvent.id !== 'VC_SELECTION_PENDING') && !playerHasVc;
  const isVcSelectionPhaseActive = gameState?.turnPhase === 'VC_SELECTION' && gameState.activeEvent?.id === 'VC_SELECTION_PENDING';
  const isMyTurnToSelectVC = isVcSelectionPhaseActive && vcSelectingPlayer?.id === thisPlayerId;

  const masterCurrentZoneData = ZONES_DATA.find(z => z.name === currentPlayer?.currentZone);
  const canMoveToSelectedZone = gameState?.turnPhase === 'End of Turn' && actualCurrentTurnPlayer?.id === thisPlayerId && !hasMovedThisTurn;

  const isInteractionDisabledDuringVC = isVcSelectionPhaseActive && gameState.activeEvent?.id === 'VC_SELECTION_PENDING';

  const isAnyVCRevealed = gameState?.players.some(p => p.isVictoryConditionRevealed) || false;
  
  // console.log("[GameClientWrapper Render] viewingRevealedHand:", viewingRevealedHand); // Added for debugging
  // console.log("[GameClientWrapper Render] disableMainButtons:", disableMainButtons);


  if (isLoading) return <div className="flex flex-col items-center justify-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /> <p className="mt-4 text-lg">Loading Game Session...</p></div>;
  if (initializationError) return <div className="flex flex-col items-center justify-center min-h-screen text-center p-4"><Logo className="w-24 h-24 mb-4 text-destructive" /><h1 className="text-3xl font-bold mb-4">Error Initializing Game</h1><p className="mb-6">{initializationError}</p><Button onClick={() => nextRouter.push('/')}><ArrowLeft className="mr-2" /> Go to Homepage</Button></div>;
  if (!gameState || !currentPlayer) return <div className="flex flex-col items-center justify-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /> <p className="mt-4 text-lg">Preparing Interface...</p></div>;


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="p-4 border-b border-border shadow-md bg-card">
        <div className="container mx-auto flex items-center">
          <div className="flex items-center space-x-2 mr-auto"><Logo className="w-10 h-10 text-primary" /><h1 className="text-2xl font-bold">Secret Societies</h1></div>
          {isHost && (<div className="flex-grow flex justify-center"><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="sm"><LogOut className="mr-2 h-4 w-4" /> Terminate Session</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>End Session?</AlertDialogTitle><AlertDialogDescription>This will permanently end the game for all players.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleTerminateSession}>Terminate</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>)}
          <div className="text-sm text-muted-foreground text-right ml-auto">
             {showLobbyView ? (<><p>Phase: <span className="font-semibold text-accent">Lobby</span></p><p>Players: <span className="font-semibold text-accent">{gameState.players.length}/{MAX_PLAYERS}</span></p></>) :
              isVcSelectionPhaseActive && vcSelectingPlayer ? (<><p>Phase: <span className="text-accent">Victory Condition Selection</span></p><p>Selecting: <span className="text-accent">{vcSelectingPlayer.name}</span> {vcSelectingPlayer.id === thisPlayerId ? "(You)" : ""}</p></>) :
              actualCurrentTurnPlayer ? (<><p>Round: <span className="text-accent">{gameState.round}</span></p><p>Turn: <span className="text-accent">{actualCurrentTurnPlayer.name}</span> ({gameState.turnPhase}) {actualCurrentTurnPlayer.id === thisPlayerId ? "(You)" : ""}</p></>) :
              (<p>Loading player info...</p>)}
            <p>Session: <span className="font-semibold text-accent whitespace-nowrap">{gameState.sessionId}</span></p>
          </div>
        </div>
      </header>

      <main className={`flex-grow container mx-auto p-2 sm:p-4 relative`}>
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 ${(!showLobbyView && !isVcSelectionPhaseActive) ? 'pb-60' : ''}`}>
            {showLobbyView && (
              <div className="lg:col-span-12">
                <Card className="max-w-lg mx-auto my-8 p-6 shadow-xl"><CardHeader><CardTitle className="text-center text-2xl">Game Lobby</CardTitle><CardDescription className="text-center">Session ID: {gameState.sessionId}</CardDescription></CardHeader><CardContent className="space-y-4">
                    <div><h3 className="font-semibold text-lg flex items-center mb-2"><Users className="mr-2 h-5 w-5 text-accent"/>Players ({gameState.players.length}/{MAX_PLAYERS}):</h3><ul className="list-disc pl-5 space-y-1">{gameState.players.map(p => (<li key={p.id} className={p.id === thisPlayerId ? 'font-bold text-primary-foreground' : 'text-muted-foreground'}>{p.name} {p.id === gameState.players[0].id ? <span className="text-xs text-accent">(Host)</span> : ""} {p.id === thisPlayerId ? <span className="text-xs text-green-400">(You)</span> : ""}</li>))}</ul></div>
                    {isHost ? ( (gameState.players.length >= MIN_PLAYERS && gameState.players.length <= MAX_PLAYERS) ? <Button onClick={handleStartGameFromLobby} className="w-full mt-4" disabled={isSubmittingAction}>{isSubmittingAction ? <Loader2 className="animate-spin mr-2"/> : <PlayCircle className="mr-2" />}Start Game ({gameState.players.length} players)</Button> : <p className="text-center text-sm text-orange-400 mt-4">Game requires {MIN_PLAYERS}-{MAX_PLAYERS} players. Currently {gameState.players.length}.</p> ) : (<p className="text-center text-sm mt-4">Waiting for host ({gameState.players[0]?.name}) to start the game...</p>)}
                  </CardContent></Card>
              </div>
            )}

            {isVcSelectionPhaseActive && (
              <div className="lg:col-span-12">
                {isMyTurnToSelectVC && (
                  <Dialog open={isMyTurnToSelectVC && !!vcSelectionOffer && !isVcDialogTemporarilyHidden}
                          onOpenChange={(isOpen) => { if (!isOpen && vcSelectionOffer) { setIsVcDialogTemporarilyHidden(true); } }}>
                    <DialogContent className="sm:max-w-lg p-0">
                      <DialogHeader className="p-6 pb-2"><DialogTitle>Select Your Victory Condition, {vcSelectingPlayer?.name}</DialogTitle><DialogDescription>Choose one of these goals to secretly pursue.</DialogDescription></DialogHeader>
                      <div className="grid gap-4 p-6 pt-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                        {vcSelectionOffer?.vcs.map(vc => (<Card key={vc.id} className={`p-4 cursor-pointer hover:ring-accent hover:shadow-md transition-all ${vcSelectionOffer.selectedVcId === vc.id ? 'ring-2 ring-accent shadow-lg bg-accent/10' : 'bg-card/50'}`} onClick={() => setVcSelectionOffer(prev => prev ? {...prev, selectedVcId: vc.id} : null)}><CardTitle className="text-md text-accent">{vc.name}</CardTitle><CardDescription className="text-sm mt-1">{vc.description}</CardDescription></Card>))}
                      </div>
                      <DialogFooter className="p-6 pt-2 flex justify-between">
                        <Button variant="outline" onClick={() => setIsVcDialogTemporarilyHidden(true)} disabled={isSubmittingAction}>View Game Board</Button>
                        <Button onClick={() => vcSelectionOffer?.selectedVcId && handleVCSelect(vcSelectionOffer.selectedVcId)} disabled={!vcSelectionOffer?.selectedVcId || isSubmittingAction}>{isSubmittingAction && <Loader2 className="animate-spin mr-2"/>}Confirm Choice</Button>
                      </DialogFooter>
                    </DialogContent></Dialog>
                )}
                {isMyTurnToSelectVC && isVcDialogTemporarilyHidden && (
                    <Card className="p-6 text-center my-8 max-w-lg mx-auto shadow-lg">
                        <CardHeader><CardTitle>Victory Condition Selection Paused</CardTitle></CardHeader>
                        <CardContent>
                            <p className="mb-4">You are currently selecting your Victory Condition.</p>
                            <Button onClick={() => setIsVcDialogTemporarilyHidden(false)}><BookOpen className="mr-2"/>Resume Selection</Button>
                        </CardContent>
                    </Card>
                )}
                {vcSelectingPlayer?.id !== thisPlayerId && (
                    <Card className="p-6 text-center my-8 max-w-lg mx-auto shadow-lg"><CardTitle>Victory Condition Selection</CardTitle><CardDescription className="mt-2">Waiting for <span className="font-semibold text-accent">{vcSelectingPlayer?.name}</span> to choose their secret goal.</CardDescription><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mt-4" /></Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
                    <aside className="lg:col-span-3 space-y-4">
                        {currentPlayer && <PlayerResourcesDisplay player={currentPlayer} manualInputs={manualResourceInputs} onManualInputChange={handleManualResourceInputChange} onAdjustResource={(resType) => handleAdjustPlayerResource(currentPlayer.id, resType)} isSubmittingAction={isSubmittingAction || isInteractionDisabledDuringVC}/>}
                         <VictoryConditionDisplay
                            player={currentPlayer}
                            onRevealVictoryCondition={handleRevealVictoryCondition}
                            isSubmittingAction={isSubmittingAction || isInteractionDisabledDuringVC}
                            isHost={isHost}
                            isAnyVCRevealed={isAnyVCRevealed}
                            onEndGamePrompt={handleEndGamePrompt}
                        />
                    </aside>
                    <section className="lg:col-span-6 space-y-4">
                        <GlobalStateDisplay gameState={gameState} manualSuspicionInput={manualResourceInputs.suspicion || ""} onManualSuspicionInputChange={(val) => handleManualResourceInputChange('suspicion', val)} onAdjustSuspicion={handleAdjustGlobalSuspicion} manualMaxSuspicionAdjInput={manualResourceInputs.maxSuspicionAdjustment || ""} onManualMaxSuspicionAdjInputChange={(val) => handleManualResourceInputChange('maxSuspicionAdjustment', val)} onAdjustMaxSuspicionAdjustment={handleAdjustMaxSuspicionPerTurn} isSubmittingAction={isSubmittingAction || isInteractionDisabledDuringVC} isInteractionDisabled={isInteractionDisabledDuringVC}/>
                        <ZoneDisplay zones={gameState.zones} currentZone={currentPlayer?.currentZone || ZONE_NAMES[0]} onZoneSelect={()=>{}} playerLocations={gameState.players.map(p => ({playerId: p.id, zoneName: p.currentZone, playerName: p.name}))} canMovePlayer={false} borderingZones={[]} />
                    </section>
                    <aside className="lg:col-span-3 space-y-4">
                        <GameLogDisplay logs={gameState.gameLog} />
                        <OtherPlayersSummary
                            players={gameState.players}
                            currentPlayerId={thisPlayerId || ""}
                            onGainInsight={handleRequestHandReveal}
                            revealedMaskTypesThisTurn={gameState.revealedMaskTypesThisTurn || []}
                            getFullCardDetails={getFullCardDetails}
                            isSubmittingAction={isSubmittingAction || isInteractionDisabledDuringVC}
                            isInteractionDisabled={isInteractionDisabledDuringVC}
                        />
                    </aside>
                </div>
              </div>
            )}

            {(!showLobbyView && !isVcSelectionPhaseActive) && (
                <>
                    <aside className="lg:col-span-3 space-y-4">
                        <PlayerResourcesDisplay player={currentPlayer} manualInputs={manualResourceInputs} onManualInputChange={handleManualResourceInputChange} onAdjustResource={(resType) => handleAdjustPlayerResource(currentPlayer.id, resType)} isSubmittingAction={isSubmittingAction}/>
                         <VictoryConditionDisplay
                            player={currentPlayer}
                            onRevealVictoryCondition={handleRevealVictoryCondition}
                            isSubmittingAction={isSubmittingAction}
                            isHost={isHost}
                            isAnyVCRevealed={isAnyVCRevealed}
                            onEndGamePrompt={handleEndGamePrompt}
                        />
                        <MasksDisplay
                          masks={currentPlayer.masks}
                          ownerPlayerId={currentPlayer.id}
                          revealedMaskTypesThisTurnServer={gameState.revealedMaskTypesThisTurn || []}
                          onSelectMask={(maskType) => {
                            if (exploitState?.step === 'selectMask') handleMaskSelectForExploit(maskType);
                            else if (revealState?.step === 'selectMask') handleMaskSelectForReveal(maskType);
                          }}
                          isExploitMaskSelection={isExploitingMask}
                          isRevealMaskSelection={isRevealingMask}
                          onCancelMaskSelectionForExploit={isExploitingMask ? goBackToExploitCardSelection : undefined}
                          isMaskRevealedThisTurnByCurrentPlayerClient={(maskType) => revealedMasksThisTurn.has(maskType)}
                          onDiscardSecretFromMask={handleManualDiscardFromMaskPrompt}
                          onReturnSecretToHand={handleManualReturnSecretFromMaskToHand}
                          isCurrentPlayer={true}
                          isSubmittingAction={isSubmittingAction}
                          getFullCardDetails={getFullCardDetails}
                        />
                    </aside>

                    <section className={`lg:col-span-6 space-y-4`}>
                        <GlobalStateDisplay gameState={gameState} manualSuspicionInput={manualResourceInputs.suspicion || ""} onManualSuspicionInputChange={(val) => handleManualResourceInputChange('suspicion', val)} onAdjustSuspicion={handleAdjustGlobalSuspicion} manualMaxSuspicionAdjInput={manualResourceInputs.maxSuspicionAdjustment || ""} onManualMaxSuspicionAdjInputChange={(val) => handleManualResourceInputChange('maxSuspicionAdjustment', val)} onAdjustMaxSuspicionAdjustment={handleAdjustMaxSuspicionPerTurn} isSubmittingAction={isSubmittingAction} isInteractionDisabled={isInteractionDisabledDuringVC}/>
                        <ZoneDisplay zones={gameState.zones} currentZone={currentPlayer.currentZone} onZoneSelect={handleZoneSelect} playerLocations={gameState.players.map(p => ({playerId: p.id, zoneName: p.currentZone, playerName: p.name}))} canMovePlayer={canMoveToSelectedZone} borderingZones={masterCurrentZoneData?.borders || []}/>

                        {actualCurrentTurnPlayer?.id === thisPlayerId && (
                            <TurnActions currentPhase={gameState.turnPhase} onDraw={handleDraw} onReturnExploits={handleReturnExploits} onExploitSecrets={startExploitPhaseAction} onRevealSecrets={startRevealPhaseAction} onEndTurn={handleEndTurn} onProceedToNextPhase={handleProceedToNextPhase} proceedButtonText={proceedButtonText} canProceed={proceedEnabled} canPerformAction={canPerformAction} isMidAction={disableMainButtons} isSubmittingAction={isSubmittingAction} isExploitingCard={isExploitingCard} onCancelExploitCardSelection={cancelExploitCardSelection} isExploitingMask={isExploitingMask} onCancelExploitMaskSelection={cancelExploitMaskSelectionAndFullAttempt} onGoBackToExploitCardSelection={goBackToExploitCardSelection} isRevealingMask={isRevealingMask} onCancelRevealSelection={cancelRevealSelection}/>
                        )}
                        {actualCurrentTurnPlayer?.id !== thisPlayerId && (
                            <Card className="p-4 text-center shadow-md"><p className="text-lg font-semibold text-primary-foreground">Waiting for {actualCurrentTurnPlayer.name}'s turn ({gameState.turnPhase})...</p>{isSubmittingAction && <Loader2 className="animate-spin mt-2 h-5 w-5 text-primary"/>}</Card>
                        )}
                    </section>

                    <aside className="lg:col-span-3 space-y-4">
                        <GameLogDisplay logs={gameState.gameLog} />
                        <OtherPlayersSummary
                            players={gameState.players}
                            currentPlayerId={thisPlayerId || ""}
                            onGainInsight={handleRequestHandReveal}
                            revealedMaskTypesThisTurn={gameState.revealedMaskTypesThisTurn || []}
                            getFullCardDetails={getFullCardDetails}
                            isSubmittingAction={isSubmittingAction}
                            isInteractionDisabled={isInteractionDisabledDuringVC}
                        />
                    </aside>
                </>
            )}
        </div>
      </main>

      {(!showLobbyView && !isVcSelectionPhaseActive && actualCurrentTurnPlayer && currentPlayer) && (
            <div className="fixed bottom-0 left-0 right-0 z-20 border-t-2 border-primary bg-background/95 backdrop-blur-sm"><div className="container mx-auto p-2">
                <HandDisplay hand={currentPlayer.hand} title={`Your Hand (${currentPlayer.hand.length}) ${isExploitingCard ? '- Select Card to Exploit' : ''}`} onSelectCard={isExploitingCard ? handleCardSelectForExploit : undefined} onCardClickForGive={!isExploitingCard ? handleOpenGiveSecretDialog : undefined} onDiscardCard={!isExploitingCard ? handleManualDiscardPrompt : undefined} selectable={isExploitingCard} isSubmittingAction={isSubmittingAction} getFullCardDetails={getFullCardDetails}/>
            </div></div>
        )}

      {showHandRevealRequestDialog && handRevealRequester && (
        <Dialog open={showHandRevealRequestDialog} onOpenChange={(open) => { if(!open) { setShowHandRevealRequestDialog(false); setHandRevealRequester(null); }}}>
          <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="text-xl">Hand Reveal Request</DialogTitle><DialogDescription className="mt-2">{handRevealRequester.playerName} wants to see your hand. Do you allow it?</DialogDescription></DialogHeader>
            <DialogFooter className="gap-2 mt-4"><Button variant="destructive" onClick={() => handleRespondToHandReveal(false)} disabled={isSubmittingAction}><X className="mr-2"/>Deny</Button><Button onClick={() => handleRespondToHandReveal(true)} disabled={isSubmittingAction}><Check className="mr-2"/>Allow</Button></DialogFooter>
          </DialogContent></Dialog>
      )}
      {viewingRevealedHand && (
        <Dialog open={!!viewingRevealedHand} onOpenChange={(open) => { if (!open) { handleAcknowledgeHandReveal(); } }}>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>{viewingRevealedHand.targetPlayerName}'s Hand ({viewingRevealedHand.hand.length} cards)</DialogTitle></DialogHeader>
            {viewingRevealedHand.hand.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 py-4" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                    {viewingRevealedHand.hand.map(cardRef => {
                        const card = getFullCardDetails(cardRef);
                        if (!card) return <div key={cardRef.instanceId} className="text-xs text-red-500">Error loading card {cardRef.id}</div>;
                        return (
                            <TooltipProvider key={card.instanceId}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Card className="p-2 cursor-help bg-card/70 hover:shadow-md transition-shadow">
                                            <h4 className="text-xs font-semibold truncate text-accent">{card.name} <span className="text-muted-foreground">({card.rarity})</span></h4>
                                            <p className="text-xs mt-0.5 text-muted-foreground">Zone: {card.zone}</p>
                                        </Card>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <SecretCardTooltipContent card={card} />
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    })}
                </div>
            ) : (
                <p className="py-4 text-center text-muted-foreground">{viewingRevealedHand.targetPlayerName}'s hand is empty.</p>
            )}
            <DialogFooter>
                <Button onClick={handleAcknowledgeHandReveal} disabled={isSubmittingAction}>{isSubmittingAction && <Loader2 className="animate-spin mr-2"/>}Close</Button>
            </DialogFooter>
          </DialogContent></Dialog>
      )}
      {showGiveSecretDialog && cardToGive && gameState && (
        <Dialog open={showGiveSecretDialog} onOpenChange={handleCloseGiveSecretDialog}>
          <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="text-xl">Give Secret: <span className="text-accent">{getFullCardDetails(cardToGive)?.name || 'Card'}</span></DialogTitle><DialogDescription className="mt-2">Choose a player to give this secret to.</DialogDescription></DialogHeader>
            <div className="py-4"><Select onValueChange={setRecipientForGiveSecret} value={recipientForGiveSecret || ""}><SelectTrigger><SelectValue placeholder="Select player..." /></SelectTrigger><SelectContent>{gameState.players.filter(p => p.id !== thisPlayerId).map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select></div>
            <DialogFooter className="gap-2"><Button variant="outline" onClick={handleCloseGiveSecretDialog} disabled={isSubmittingAction}>Cancel</Button><Button onClick={handleConfirmGiveSecret} disabled={!recipientForGiveSecret || isSubmittingAction}>{isSubmittingAction && <Loader2 className="animate-spin mr-2"/>}<Gift className="mr-2"/>Confirm Give</Button></DialogFooter>
          </DialogContent></Dialog>
      )}
      {showDiscardHandConfirm?.cardRef && (
        <AlertDialog open={!!showDiscardHandConfirm} onOpenChange={(open) => { if (!open) cancelDiscardHand(); }}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Confirm Discard</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to discard {getFullCardDetails(showDiscardHandConfirm.cardRef)?.name || 'this card'} from your hand?
                <br />
                Target deck ({showDiscardHandConfirm.targetZoneName || 'N/A'}) has {showDiscardHandConfirm.targetDeckLength} cards.
              </AlertDialogDescription>
            </AlertDialogHeader>
             <div className="space-y-2">
                <Label htmlFor="discardPositionHand">Return to Deck Position (optional, 0 for top, empty for bottom):</Label>
                <Input
                    id="discardPositionHand"
                    type="number"
                    placeholder={`e.g., 0 for top, ${showDiscardHandConfirm.targetDeckLength} for bottom`}
                    value={discardReturnPosition}
                    onChange={(e) => setDiscardReturnPosition(e.target.value)}
                    className="text-sm"
                />
            </div>
            <AlertDialogFooter><AlertDialogCancel onClick={cancelDiscardHand} disabled={isSubmittingAction}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDiscardHand} disabled={isSubmittingAction}>{isSubmittingAction && <Loader2 className="animate-spin mr-2"/>}Discard</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent></AlertDialog>
      )}
      {showDiscardMaskConfirm?.maskType && (
        <AlertDialog open={!!showDiscardMaskConfirm} onOpenChange={(open) => { if (!open) cancelDiscardMask(); }}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Confirm Discard from Mask</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to discard the secret from your {showDiscardMaskConfirm.maskType} mask?
                <br />
                Target deck ({showDiscardMaskConfirm.targetZoneName || 'N/A'}) has {showDiscardMaskConfirm.targetDeckLength} cards.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
                <Label htmlFor="discardPositionMask">Return to Deck Position (optional, 0 for top, empty for bottom):</Label>
                <Input
                    id="discardPositionMask"
                    type="number"
                    placeholder={`e.g., 0 for top, ${showDiscardMaskConfirm.targetDeckLength} for bottom`}
                    value={discardReturnPosition}
                    onChange={(e) => setDiscardReturnPosition(e.target.value)}
                    className="text-sm"
                />
            </div>
            <AlertDialogFooter><AlertDialogCancel onClick={cancelDiscardMask} disabled={isSubmittingAction}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDiscardMask} disabled={isSubmittingAction}>{isSubmittingAction && <Loader2 className="animate-spin mr-2"/>}Discard</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent></AlertDialog>
      )}
      {drawOffer && actualCurrentTurnPlayer?.id === thisPlayerId && (
        <Dialog open={!!drawOffer} onOpenChange={(isOpen) => { if (!isOpen && !isSubmittingAction) setDrawOffer(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Draw Secrets from {currentPlayer.currentZone}</DialogTitle><DialogDescription>You may take 1 secret for free. Each additional secret costs 3 Gold.</DialogDescription></DialogHeader>
            <div className="grid gap-3 py-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                {drawOffer.cards.length > 0 ? drawOffer.cards.map((card, index) => (<div key={card.instanceId} className="flex items-center gap-3 p-3 border rounded-md hover:bg-accent/10 transition-colors"><Checkbox id={`draw-${index}`} checked={drawOffer.selectedIndices.includes(index)} onCheckedChange={(c) => handleDrawSelectionChange(index, !!c)} disabled={isSubmittingAction} className="h-5 w-5"/><Label htmlFor={`draw-${index}`} className="flex-1 cursor-pointer space-y-1"><p className="font-semibold text-primary-foreground">{card.name} <span className="text-xs text-muted-foreground">({card.rarity})</span></p><p className="text-xs text-muted-foreground">Zone: {card.zone}</p><p className="text-xs text-muted-foreground line-clamp-2">Exploit: {card.exploitEffect}</p><p className="text-xs text-muted-foreground line-clamp-2">Reveal: {card.revealEffect}</p></Label></div>)) : (<p className="text-center py-4 text-muted-foreground">No secrets available to draw from this zone.</p>)}
              {drawOffer.cards.length > 0 && (<p className="text-sm text-center mt-2">Cost: {Math.max(0, drawOffer.selectedIndices.length - 1) * 3} Gold. Your Gold: {currentPlayer.gold}.</p>)}
              {isSubmittingAction && <Loader2 className="animate-spin mx-auto mt-2 h-5 w-5 text-primary"/>}</div>
            <DialogFooter><Button variant="outline" onClick={()=> {setDrawOffer(null); toast({title: "Draw Cancelled"})}} disabled={isSubmittingAction}>Cancel</Button><Button onClick={confirmDrawSelection} disabled={isSubmittingAction}>{isSubmittingAction && <Loader2 className="animate-spin mr-2"/>}{drawOffer.cards.length === 0 || drawOffer.selectedIndices.length === 0 ? "Skip Draw" : "Confirm Draw"}</Button></DialogFooter>
          </DialogContent></Dialog>
      )}
      {showEndGameDialog && isHost && gameState && (
        <Dialog open={showEndGameDialog} onOpenChange={setShowEndGameDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>End Game and Declare Winner</DialogTitle>
              <DialogDescription>Select the player who has won the game. This action will delete the current game session.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <RadioGroup value={potentialWinnerId || ""} onValueChange={setPotentialWinnerId}>
                {gameState.players.map(p => (
                  <div key={p.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={p.id} id={`winner-${p.id}`} />
                    <Label htmlFor={`winner-${p.id}`}>{p.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowEndGameDialog(false)} disabled={isSubmittingAction}>Cancel</Button>
              <Button onClick={handleConfirmEndGame} disabled={!potentialWinnerId || isSubmittingAction}>
                {isSubmittingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Winner & End Game
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <footer className="p-4 border-t text-center text-xs text-muted-foreground bg-card">Secret Societies - A game of secrets and power.</footer>
    </div>
  );
}
