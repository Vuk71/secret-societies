
"use client";

import type { Player, SecretCard, GameState, StoredSecretCardReference } from "@/types/game"; // Added StoredSecretCardReference
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Moon, Sun, CloudDrizzle, Zap, CheckCircle, Eye, XCircle, ArrowLeftCircle, Info, Trash2, ArchiveRestore } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SecretCardTooltipContent } from './HandDisplay';
import { cn } from "@/lib/utils";


interface MasksDisplayProps {
  masks: Player["masks"]; // Will contain StoredSecretCardReference | null
  ownerPlayerId: string;
  revealedMaskTypesThisTurnServer: Array<keyof Player['masks']>;
  currentlyPulsingMasks: Array<{ playerId: string; maskType: keyof Player['masks']; revealedByPlayerId: string }>;
  onSelectMask?: (maskType: keyof Player["masks"]) => void;
  isExploitMaskSelection?: boolean;
  isRevealMaskSelection?: boolean;
  onCancelMaskSelectionForExploit?: () => void;
  isMaskRevealedThisTurnByCurrentPlayerClient: (maskType: keyof Player['masks']) => boolean;
  onDiscardSecretFromMask?: (maskType: keyof Player['masks']) => void;
  onReturnSecretToHand?: (maskType: keyof Player['masks']) => void;
  isCurrentPlayer: boolean;
  isSubmittingAction?: boolean;
  getFullCardDetails: (cardRef: StoredSecretCardReference | null) => SecretCard | null; // Prop for lookup function
}

const MASK_ORDER: Array<keyof Player['masks']> = ['solar', 'lunar', 'shadow', 'eclipse'];

const MaskSlot: React.FC<{
  icon: React.ElementType;
  label: string;
  cardRef: StoredSecretCardReference | null; // Now receives a reference
  maskType: keyof Player["masks"];
  ownerPlayerId: string;
  isGloballyPulsing: boolean;
  onSelectMask?: (maskType: keyof Player["masks"]) => void;
  isSelectableForExploit: boolean;
  isSelectableForReveal: boolean;
  alreadyRevealedThisTurnByMeClient: boolean;
  onDiscardSecretFromMask?: (maskType: keyof Player['masks']) => void;
  onReturnSecretToHand?: (maskType: keyof Player['masks']) => void;
  isCurrentPlayerSlot: boolean;
  isSubmittingAction?: boolean;
  getFullCardDetails: (cardRef: StoredSecretCardReference | null) => SecretCard | null;
}> = ({
    icon: Icon,
    label,
    cardRef, // Changed from card to cardRef
    maskType,
    ownerPlayerId,
    isGloballyPulsing,
    onSelectMask,
    isSelectableForExploit,
    isSelectableForReveal,
    alreadyRevealedThisTurnByMeClient,
    onDiscardSecretFromMask,
    onReturnSecretToHand,
    isCurrentPlayerSlot,
    isSubmittingAction,
    getFullCardDetails
}) => {

  const fullCard = getFullCardDetails(cardRef); // Look up full card details

  const isEclipseSlot = maskType === 'eclipse';
  const canSelectForExploit = isCurrentPlayerSlot && isSelectableForExploit && !fullCard; // Check based on fullCard presence
  const canSelectForReveal = isCurrentPlayerSlot && !isEclipseSlot && isSelectableForReveal && !alreadyRevealedThisTurnByMeClient;
  const isCurrentlySelectable = canSelectForExploit || canSelectForReveal;

  let eclipseTitle = "Eclipse Mask (Special - only usable via card effects or specific exploit)";
  if (isCurrentPlayerSlot && isSelectableForExploit && isEclipseSlot && !fullCard) {
    eclipseTitle = "Select Eclipse Mask to place secret";
  } else if (isCurrentPlayerSlot && isSelectableForExploit && isEclipseSlot && fullCard) {
     eclipseTitle = "Eclipse Mask (Occupied - special use)";
  }


  const cardBaseClasses = "p-3 bg-secondary/40 transition-all duration-150 ease-in-out relative group";
  const selectableClasses = isCurrentlySelectable ? 'cursor-pointer hover:ring-2 hover:ring-accent' : '';
  const exploitSelectableClasses = canSelectForExploit ? 'border-green-500' : '';
  const revealSelectableClasses = canSelectForReveal ? 'border-blue-500' : '';

  const eclipseBorderClass = isEclipseSlot ? 'border-purple-600' : '';
  const eclipseOpacityClass = (isEclipseSlot && !fullCard && !isSelectableForExploit) ? 'opacity-75' : '';


  const pulseClass = isGloballyPulsing ? 'animate-slow-pulse' : '';

  return (
    <Card
      className={cn(
        cardBaseClasses,
        selectableClasses,
        exploitSelectableClasses,
        revealSelectableClasses,
        eclipseBorderClass,
        eclipseOpacityClass,
        pulseClass
      )}
      onClick={() => isCurrentlySelectable && onSelectMask && !isSubmittingAction && onSelectMask(maskType)}
      tabIndex={isCurrentlySelectable ? 0 : -1}
      onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && isCurrentlySelectable && onSelectMask && !isSubmittingAction) {
              onSelectMask(maskType);
          }
      }}
      title={isEclipseSlot ? eclipseTitle : label + " Mask"}
    >
      {isCurrentPlayerSlot && isCurrentlySelectable && !isSubmittingAction && (
        <div className="absolute top-1 right-1 p-0.5 bg-accent text-accent-foreground rounded-full opacity-85 group-hover:opacity-100">
          {canSelectForExploit && <CheckCircle className="w-4 h-4" title="Select for Exploit" />}
          {canSelectForReveal && <Eye className="w-4 h-4" title="Select for Reveal"/>}
        </div>
      )}
       {isCurrentPlayerSlot && isEclipseSlot && isSelectableForReveal && (
         <div className="absolute top-1 right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-85 group-hover:opacity-100">
           <XCircle className="w-4 h-4" title="Eclipse Mask: Cannot be revealed this way" />
         </div>
       )}
      <div className="flex items-center justify-between space-x-2 mb-2">
        <div className="flex items-center space-x-2">
            <Icon className={`w-5 h-5 ${isEclipseSlot ? 'text-purple-400' : 'text-accent'}`} />
            <h4 className="font-medium text-base text-primary-foreground">{label} Mask</h4>
        </div>
        <div className="flex items-center space-x-1">
            {isCurrentPlayerSlot && fullCard && onReturnSecretToHand && !isSelectableForExploit && !isSelectableForReveal && (
                 <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-blue-400/70 hover:text-blue-400 hover:bg-blue-400/10 p-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isSubmittingAction) onReturnSecretToHand(maskType);
                    }}
                    disabled={isSubmittingAction}
                    title={`Return ${fullCard.name} from ${label} mask to hand`}
                >
                    <ArchiveRestore className="w-4 h-4" />
                </Button>
            )}
            {isCurrentPlayerSlot && fullCard && onDiscardSecretFromMask && !isSelectableForExploit && !isSelectableForReveal && (
                 <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10 p-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isSubmittingAction) onDiscardSecretFromMask(maskType);
                    }}
                    disabled={isSubmittingAction}
                    title={`Discard ${fullCard.name} from ${label} mask`}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            )}
        </div>
      </div>
      {fullCard ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-2 bg-card/80 rounded-md cursor-help relative">
                <p className="font-semibold text-sm text-accent truncate" title={fullCard.name}>{fullCard.name}</p>
                <Info className="w-3 h-3 absolute bottom-1 right-1 text-muted-foreground/70 group-hover:text-accent" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <SecretCardTooltipContent card={fullCard} />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          {isEclipseSlot ? (isCurrentPlayerSlot && canSelectForExploit ? "Click to place secret" : (isSelectableForExploit && !isCurrentPlayerSlot) ? "Eclipse" : "Eclipse (Unavailable for use)") : (isCurrentPlayerSlot && canSelectForExploit ? "Click to place secret" : "Empty")}
        </p>
      )}
       {isCurrentPlayerSlot && canSelectForReveal && !isEclipseSlot && (
         <p className="text-xs text-blue-300 mt-1 italic">Click to reveal this mask.</p>
       )}
       {isCurrentPlayerSlot && alreadyRevealedThisTurnByMeClient && isSelectableForReveal && !isEclipseSlot && (
            <p className="text-xs text-orange-400 mt-1 italic">Revealed this turn.</p>
       )}
       {isEclipseSlot && !canSelectForExploit && !fullCard && <p className="text-xs text-purple-300 mt-1 italic">Requires specific effects or exploit action.</p>}
    </Card>
  );
};

export function MasksDisplay({
  masks,
  ownerPlayerId,
  revealedMaskTypesThisTurnServer,
  currentlyPulsingMasks,
  onSelectMask,
  isExploitMaskSelection = false,
  isRevealMaskSelection = false,
  onCancelMaskSelectionForExploit,
  isMaskRevealedThisTurnByCurrentPlayerClient,
  onDiscardSecretFromMask,
  onReturnSecretToHand,
  isCurrentPlayer,
  isSubmittingAction,
  getFullCardDetails,
}: MasksDisplayProps) {
  const noMasksExploited = !masks.lunar && !masks.solar && !masks.shadow && !masks.eclipse;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg text-primary-foreground">{isCurrentPlayer ? "Your Masks" : "Masks"}</CardTitle>
        {isCurrentPlayer && noMasksExploited && !isExploitMaskSelection && !isRevealMaskSelection && (
          <CardDescription>No secrets currently exploited on masks.</CardDescription>
        )}
        {isCurrentPlayer && isExploitMaskSelection && (
          <CardDescription className="text-accent">
            Select an empty mask slot to place your secret.
            {onCancelMaskSelectionForExploit && (
              <Button onClick={onCancelMaskSelectionForExploit} variant="link" size="sm" className="text-accent p-0 h-auto ml-2">
                 <ArrowLeftCircle className="mr-1 h-3 w-3" /> Choose Different Card
              </Button>
            )}
          </CardDescription>
        )}
        {isCurrentPlayer && isRevealMaskSelection && (
          <CardDescription className="text-accent">
            Select a non-Eclipse mask to reveal. Even empty masks can be revealed.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4">
        {MASK_ORDER.map((maskType) => {
            const cardRef = masks[maskType];
            const IconComponent = maskType === 'solar' ? Sun :
                                 maskType === 'lunar' ? Moon :
                                 maskType === 'shadow' ? CloudDrizzle : Zap;
            const label = maskType.charAt(0).toUpperCase() + maskType.slice(1);

            const isPulsingThisSpecificMask = (currentlyPulsingMasks || []).some(
              m => m.playerId === ownerPlayerId && m.maskType === maskType
            );
            const isGloballyPulsingForThisType = (revealedMaskTypesThisTurnServer || []).includes(maskType);


            const alreadyRevealedByMeClient = isCurrentPlayer && isMaskRevealedThisTurnByCurrentPlayerClient ? isMaskRevealedThisTurnByCurrentPlayerClient(maskType) : false;

            return (
                <MaskSlot
                    key={maskType}
                    icon={IconComponent}
                    label={label}
                    cardRef={cardRef}
                    maskType={maskType}
                    ownerPlayerId={ownerPlayerId}
                    isGloballyPulsing={isGloballyPulsingForThisType} // Changed to global pulse for all players
                    onSelectMask={onSelectMask}
                    isSelectableForExploit={isExploitMaskSelection}
                    isSelectableForReveal={isRevealMaskSelection}
                    alreadyRevealedThisTurnByMeClient={alreadyRevealedByMeClient}
                    onDiscardSecretFromMask={isCurrentPlayer ? onDiscardSecretFromMask : undefined}
                    onReturnSecretToHand={isCurrentPlayer ? onReturnSecretToHand : undefined}
                    isCurrentPlayerSlot={isCurrentPlayer}
                    isSubmittingAction={isSubmittingAction}
                    getFullCardDetails={getFullCardDetails}
                />
            );
        })}
      </CardContent>
    </Card>
  );
}

    