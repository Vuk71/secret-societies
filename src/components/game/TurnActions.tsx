
"use client";

import type { TurnPhase } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hand, RotateCcw, Eye, Wand2, SkipForward, Play, XCircle, CheckCircle, Loader2 } from "lucide-react";

interface TurnActionsProps {
  currentPhase: TurnPhase;
  onDraw: () => void;
  onReturnExploits: () => void;
  onExploitSecrets: () => void;
  onRevealSecrets: () => void;
  onEndTurn: () => void;
  onProceedToNextPhase: () => void; 
  canPerformAction: (phase: TurnPhase) => boolean;
  isMidAction?: boolean;
  isSubmittingAction?: boolean; // Added to indicate API call in progress
  isExploitingCard?: boolean;
  onCancelExploitCardSelection?: () => void;
  isExploitingMask?: boolean;
  onCancelExploitMaskSelection?: () => void;
  onGoBackToExploitCardSelection?: () => void;
  isRevealingMask?: boolean;
  onCancelRevealSelection?: () => void;
  proceedButtonText: string;
  canProceed: boolean;
}

export function TurnActions({
  currentPhase,
  onDraw,
  onReturnExploits,
  onExploitSecrets,
  onRevealSecrets,
  onEndTurn,
  onProceedToNextPhase,
  canPerformAction,
  isMidAction = false,
  isSubmittingAction = false,
  isExploitingCard,
  onCancelExploitCardSelection,
  isExploitingMask,
  onCancelExploitMaskSelection,
  onGoBackToExploitCardSelection,
  isRevealingMask,
  onCancelRevealSelection,
  proceedButtonText,
  canProceed,
}: TurnActionsProps) {
  const phaseActions: { phase: TurnPhase; label: string; icon: React.ElementType; action: () => void; show: boolean }[] = [
    { phase: "Draw", label: "Draw Secrets", icon: Hand, action: onDraw, show: currentPhase === "Draw" && !isMidAction },
    { phase: "Return Exploits", label: "Return Exploits", icon: RotateCcw, action: onReturnExploits, show: currentPhase === "Return Exploits" && !isMidAction },
    { phase: "Exploit Secrets", label: "Start Exploit", icon: Wand2, action: onExploitSecrets, show: currentPhase === "Exploit Secrets" && !isExploitingCard && !isExploitingMask && !isMidAction },
    { phase: "Reveal Secrets", label: "Start Reveal", icon: Eye, action: onRevealSecrets, show: currentPhase === "Reveal Secrets" && !isRevealingMask && !isMidAction },
  ];

  const showCancelExploitCard = isExploitingCard && onCancelExploitCardSelection;
  const showCancelExploitMaskEntirely = isExploitingMask && onCancelExploitMaskSelection;
  const showGoBackToExploitCard = isExploitingMask && onGoBackToExploitCardSelection;
  const showCancelReveal = isRevealingMask && onCancelRevealSelection;

  const disableAllButtons = isMidAction || showCancelExploitCard || showCancelExploitMaskEntirely || showGoBackToExploitCard || showCancelReveal || isSubmittingAction;

  return (
    <Card className="shadow-lg mt-4">
      <CardHeader>
        <CardTitle className="text-xl text-primary-foreground flex items-center">
          <Play className="w-6 h-6 mr-2 text-accent" />
          Player Actions
        </CardTitle>
        <p className="text-sm text-muted-foreground">Current Phase: <span className="font-semibold text-accent">{currentPhase}</span></p>
         {isSubmittingAction && (
            <div className="flex items-center text-xs text-accent animate-pulse">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting action to server...
            </div>
         )}
         {!isSubmittingAction && isMidAction && !showCancelExploitCard && !showCancelExploitMaskEntirely && !showGoBackToExploitCard && !showCancelReveal && (
            <p className="text-xs text-accent animate-pulse">Completing current action...</p>
         )}
         {!isSubmittingAction && showCancelExploitCard && <p className="text-xs text-accent">Selecting card to exploit...</p>}
         {!isSubmittingAction && showCancelExploitMaskEntirely && <p className="text-xs text-accent">Selecting mask to place secret...</p>}
         {!isSubmittingAction && showCancelReveal && <p className="text-xs text-accent">Selecting mask to reveal...</p>}
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
        {phaseActions.filter(pa => pa.show).map(({ phase, label, icon: Icon, action }) => (
          <Button
            key={phase}
            variant={"outline"}
            onClick={action}
            disabled={!canPerformAction(phase) || disableAllButtons}
            className="flex flex-col h-auto py-3 items-center justify-center space-y-1 text-center"
            aria-label={label}
            title={disableAllButtons && currentPhase === phase ? "Complete or cancel current sub-action first, or wait for server." : label}
          >
            <Icon className="w-7 h-7 mb-1" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
         <Button
            key="proceed"
            variant="default"
            onClick={onProceedToNextPhase}
            disabled={!canProceed || disableAllButtons}
            className="flex flex-col h-auto py-3 items-center justify-center space-y-1 text-center sm:col-start-auto"
            title={disableAllButtons ? "Complete or cancel current sub-action first, or wait for server." : proceedButtonText}
          >
            {isSubmittingAction ? <Loader2 className="w-7 h-7 mb-1 animate-spin" /> : (currentPhase === "End of Turn" ? <SkipForward className="w-7 h-7 mb-1" /> : <CheckCircle className="w-7 h-7 mb-1" />)}
            <span className="text-xs">{isSubmittingAction ? "Processing..." : proceedButtonText}</span>
          </Button>
      </CardContent>
      {(!isSubmittingAction && (showCancelExploitCard || showCancelExploitMaskEntirely || showGoBackToExploitCard || showCancelReveal)) && (
        <CardContent className="p-4 pt-0 border-t border-border mt-2">
          <h4 className="text-sm font-medium mb-2 text-center">Cancel Options:</h4>
          <div className="flex gap-2 justify-center flex-wrap">
            {showCancelExploitCard && onCancelExploitCardSelection && (
              <Button variant="destructive" onClick={onCancelExploitCardSelection} size="sm">
                <XCircle className="mr-2" /> Cancel Exploit
              </Button>
            )}
            {showGoBackToExploitCard && onGoBackToExploitCardSelection && (
               <Button variant="outline" onClick={onGoBackToExploitCardSelection} size="sm">
                 <RotateCcw className="mr-2" /> Choose Different Card
               </Button>
            )}
            {showCancelExploitMaskEntirely && onCancelExploitMaskSelection && (
              <Button variant="destructive" onClick={onCancelExploitMaskSelection} size="sm">
                <XCircle className="mr-2" /> Cancel Exploit Attempt
              </Button>
            )}
            {showCancelReveal && onCancelRevealSelection && (
              <Button variant="destructive" onClick={onCancelRevealSelection} size="sm">
                <XCircle className="mr-2" /> Cancel Reveal
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
