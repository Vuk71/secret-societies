"use client";

import type { Player, SecretCard, PlayerResourceType, StoredSecretCardReference, ZoneName } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Scroll as InfoIconLucideOld, ShieldCheck, Coins, EyeOff, Moon, Sun, CloudDrizzle, Zap, Scroll, Info, Eye as EyeIcon, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SecretCardTooltipContent } from './HandDisplay';
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface OtherPlayersSummaryProps {
  players: Player[];
  currentPlayerId: string;
  onGainInsight: (targetPlayerId: string) => void;
  revealedMaskTypesThisTurn: Array<keyof Player['masks']>;
  isSubmittingAction: boolean;
  getFullCardDetails: (cardRef: StoredSecretCardReference | null) => SecretCard | null;
  isInteractionDisabled?: boolean; 
}

const MASK_ORDER_OPPONENT: Array<keyof Player['masks']> = ['solar', 'lunar', 'shadow', 'eclipse'];

const OpponentMaskSlot: React.FC<{
  maskType: keyof Player['masks'];
  cardRef: StoredSecretCardReference | null; 
  isPulsing: boolean;
  getFullCardDetails: (cardRef: StoredSecretCardReference | null) => SecretCard | null;
}> = ({ maskType, cardRef, isPulsing, getFullCardDetails }) => {
  const fullCard = getFullCardDetails(cardRef); 
  const Icon = maskType === 'solar' ? Sun :
               maskType === 'lunar' ? Moon :
               maskType === 'shadow' ? CloudDrizzle :
               Zap;
  const label = maskType.charAt(0).toUpperCase() + maskType.slice(1);

  const eclipseOpacityClass = (maskType === 'eclipse' && !fullCard) ? 'opacity-75' : '';


  return (
    <div className={cn(
      "flex items-center space-x-2 p-1.5 rounded-md bg-secondary/20",
      isPulsing && maskType !== 'eclipse' ? 'animate-slow-pulse' : '',
      eclipseOpacityClass
    )}>
      <Icon className={`w-4 h-4 ${maskType === 'eclipse' ? 'text-purple-400' : 'text-accent/80'}`} />
      <span className="text-xs font-medium text-muted-foreground">{label}:</span>
      {fullCard ? (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-primary-foreground truncate cursor-help flex items-center">
                {fullCard.name} <Info className="w-3 h-3 ml-1 text-muted-foreground/50"/>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <SecretCardTooltipContent card={fullCard} />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <span className="text-xs text-muted-foreground/70 italic">Empty</span>
      )}
    </div>
  );
};


export function OtherPlayersSummary({ 
    players, 
    currentPlayerId, 
    onGainInsight, 
    revealedMaskTypesThisTurn, 
    isSubmittingAction, 
    getFullCardDetails,
    isInteractionDisabled = false 
}: OtherPlayersSummaryProps) {
  const [visibleHandPlayerId, setVisibleHandPlayerId] = useState<string | null>(null);
  const otherPlayers = players.filter(p => p.id !== currentPlayerId && !p.isEliminated);

  if (otherPlayers.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg text-primary-foreground">Rivals in the Court</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No other active players in the game.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg text-primary-foreground">Rivals in the Court</CardTitle>
        <CardDescription>Keep an eye on your adversaries.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {otherPlayers.map(player => (
          <Card key={player.id} className="p-3 bg-card/60 border border-border/50">
            <div className="flex justify-between items-start mb-2">
            <h4 className="text-base font-semibold text-primary-foreground flex items-center">
                <User className="w-4 h-4 mr-2 text-accent" />
                {player.name} 
                <span className="text-sm text-muted-foreground ml-2"> (Zone: {player.currentZone})</span>
            </h4>
              {player.isEliminated && <span className="text-xs text-destructive font-bold">(Eliminated)</span>}
            </div>

            <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div className="flex items-center"><ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-green-400" /> Trust: {player.trust}</div>
              <div className="flex items-center"><Coins className="w-3.5 h-3.5 mr-1.5 text-yellow-400" /> Gold: {player.gold}</div>
              <div className="flex items-center"><Scroll className="w-3.5 h-3.5 mr-1.5 text-blue-400" /> Info: {player.information}</div>
              <div className="flex items-center"><EyeOff className="w-3.5 h-3.5 mr-1.5 text-purple-400" /> Secrecy: {player.secrecy}</div>
              <p className="col-span-2 flex items-center"><HandIcon /> Cards: {player.hand.length}</p>
            </div>
            <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs w-full py-1.5"
                onClick={() => {
                  setVisibleHandPlayerId(player.id);
                  if (typeof onGainInsight === 'function') {
                    onGainInsight(player.id);
                  }
                }}
                disabled={isSubmittingAction || isInteractionDisabled}
                title={`See ${player.name}'s hand`}
            >
                <EyeIcon className="w-3.5 h-3.5 mr-1.5" /> Gain Insight (Hand)
            </Button>
            <Dialog open={visibleHandPlayerId === player.id} onOpenChange={open => { if (!open) setVisibleHandPlayerId(null); }}>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>{player.name}'s Hand ({player.hand.length} cards)</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                  {player.hand.length > 0 ? player.hand.map(cardRef => {
                    const card = getFullCardDetails(cardRef);
                    if (!card) return <div key={cardRef.instanceId} className="text-xs text-red-500">Error loading card {cardRef.id}</div>;
                    return (
                      <TooltipProvider key={card.instanceId}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Card className="p-2 bg-card/70 relative group cursor-pointer">
                              <h4 className="font-semibold text-xs text-accent truncate" title={card.name}>
                                {card.name} <span className="text-muted-foreground">({card.rarity})</span>
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5">Zone: {card.zone}</p>
                            </Card>
                          </TooltipTrigger>
                          <TooltipContent>
                            <SecretCardTooltipContent card={card} />
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }) : <div className="text-xs italic text-muted-foreground">Hand is empty.</div>}
                </div>
              </DialogContent>
            </Dialog>
            <div className="mt-3 pt-2 border-t border-border/30 space-y-1.5">
              <h5 className="text-xs font-semibold text-primary-foreground mb-1">Masks:</h5>
              {Array.isArray(MASK_ORDER_OPPONENT) && MASK_ORDER_OPPONENT.map(maskType => (
                <OpponentMaskSlot
                  key={maskType}
                  maskType={maskType}
                  cardRef={player.masks[maskType]} 
                  isPulsing={Array.isArray(revealedMaskTypesThisTurn) && revealedMaskTypesThisTurn.includes(maskType)}
                  getFullCardDetails={getFullCardDetails}
                />
              ))}
            </div>
            {player.isVictoryConditionRevealed && player.victoryCondition && (
              <div className="mt-3 pt-2 border-t border-border/30">
                <h5 className="text-xs font-semibold text-green-400 flex items-center">
                    <Trophy className="w-3.5 h-3.5 mr-1.5" /> Victory Condition Revealed:
                </h5>
                 <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xs text-green-300 cursor-help underline decoration-dotted">{player.victoryCondition.name}</p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{player.victoryCondition.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

const HandIcon: React.FC = () => <Scroll className="w-3.5 h-3.5 mr-1.5 text-orange-400" />;

