
"use client";

import type { Player, VictoryCondition } from '@/types/game';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Eye as EyeIcon, CheckCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VictoryConditionDisplayProps {
  player: Player | null | undefined;
  onRevealVictoryCondition?: () => void;
  isSubmittingAction?: boolean;
  isHost: boolean;
  isAnyVCRevealed: boolean;
  onEndGamePrompt?: () => void;
}

export function VictoryConditionDisplay({
  player,
  onRevealVictoryCondition,
  isSubmittingAction,
  isHost,
  isAnyVCRevealed,
  onEndGamePrompt,
}: VictoryConditionDisplayProps) {
  const vc = player?.victoryCondition;
  const isRevealed = player?.isVictoryConditionRevealed;

  return (
    <Card className="shadow-md mt-4">
      <CardHeader>
        <CardTitle className="text-lg text-primary-foreground flex items-center">
          <Trophy className="w-5 h-5 mr-2 text-accent" />
          {isRevealed ? "Victory Condition Revealed" : "Your Victory Condition"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {vc ? (
          <>
            {isRevealed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h4 className="font-semibold text-accent cursor-help underline decoration-dotted">{vc.name}</h4>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{vc.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <h4 className="font-semibold text-accent">{vc.name}</h4>
            )}
            {!isRevealed && <CardDescription className="text-sm">{vc.description}</CardDescription>}
            
            {!isRevealed && onRevealVictoryCondition && (
              <Button
                onClick={onRevealVictoryCondition}
                disabled={isSubmittingAction}
                className="w-full mt-2"
                variant="outline"
              >
                {isSubmittingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <EyeIcon className="mr-2 h-4 w-4" />}
                Reveal My Victory Condition
              </Button>
            )}
            {isRevealed && (
              <p className="text-sm text-green-400 font-semibold flex items-center mt-1">
                <CheckCircle className="mr-2 h-4 w-4" /> This Victory Condition is now public!
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No Victory Condition selected yet, or it's hidden.</p>
        )}

        {isHost && isAnyVCRevealed && onEndGamePrompt && (
          <Button
            onClick={onEndGamePrompt}
            disabled={isSubmittingAction}
            className="w-full mt-4"
            variant="destructive"
          >
            {isSubmittingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            End Game & Declare Winner
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
