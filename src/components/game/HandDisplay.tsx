
"use client";

import type { SecretCard, StoredSecretCardReference } from "@/types/game"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scroll, CheckCircle, Info, Trash2, Gift } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export const SecretCardTooltipContent: React.FC<{ card: SecretCard }> = ({ card }) => {
  return (
    <div className="w-64 bg-popover text-popover-foreground p-3 shadow-lg rounded-md border border-border">
      <p className="font-bold text-accent text-sm">{card.name} <span className="text-xs text-muted-foreground">({card.rarity} - {card.zone})</span></p>
      <p className="text-xs mt-1"><strong className="text-primary-foreground">Exploit:</strong> {card.exploitEffect}</p>
      <p className="text-xs mt-1"><strong className="text-primary-foreground">Reveal:</strong> {card.revealEffect}</p>
      {card.flavor && <p className="text-xs mt-2 italic text-muted-foreground/80">{card.flavor}</p>}
    </div>
  );
};


interface HandDisplayProps {
  hand: StoredSecretCardReference[]; 
  onSelectCard?: (cardRef: StoredSecretCardReference) => void; 
  onCardClickForGive?: (cardRef: StoredSecretCardReference) => void; 
  onDiscardCard?: (cardRef: StoredSecretCardReference) => void; 
  title?: string;
  selectable?: boolean;
  isSubmittingAction?: boolean;
  getFullCardDetails: (cardRef: StoredSecretCardReference | null) => SecretCard | null; 
}

export function HandDisplay({
  hand,
  onSelectCard,
  onCardClickForGive,
  onDiscardCard,
  title = "Your Hand",
  selectable = false,
  isSubmittingAction = false,
  getFullCardDetails,
}: HandDisplayProps) {
  return (
    <Card className="shadow-md border-primary/50">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base text-primary-foreground flex items-center">
          <Scroll className="w-5 h-5 mr-2 text-accent" />
          {title} {/* Removed ({hand.length}) from here */}
        </CardTitle>
        {hand.length === 0 && <CardDescription className="text-xs">Your hand is empty.</CardDescription>}
      </CardHeader>
      {hand.length > 0 && (
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-2 max-h-48 overflow-y-auto">
          {hand.map((cardRef) => {
            const card = getFullCardDetails(cardRef); 
            if (!card) return null; 

            return (
              <TooltipProvider key={card.instanceId} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card
                      className={`p-2 bg-card/70 hover:shadow-lg transition-all duration-150 ease-in-out relative group
                        ${(selectable || onCardClickForGive) ? 'cursor-pointer hover:ring-2 hover:ring-accent' : 'cursor-help'}
                      `}
                      onClick={() => {
                        if (selectable && onSelectCard && !isSubmittingAction) {
                          onSelectCard(cardRef); 
                        } else if (!selectable && onCardClickForGive && !isSubmittingAction) {
                          onCardClickForGive(cardRef); 
                        }
                      }}
                      tabIndex={(selectable || onCardClickForGive) ? 0 : -1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (selectable && onSelectCard && !isSubmittingAction) {
                            onSelectCard(cardRef);
                          } else if (!selectable && onCardClickForGive && !isSubmittingAction) {
                            onCardClickForGive(cardRef);
                          }
                        }
                      }}
                    >
                      {selectable && (
                        <div className="absolute top-1 right-1 p-0.5 bg-accent text-accent-foreground rounded-full opacity-75 group-hover:opacity-100">
                          <CheckCircle className="w-3 h-3" />
                        </div>
                      )}
                      <h4 className="font-semibold text-xs text-accent truncate" title={card.name}>
                        {card.name} <span className="text-muted-foreground">({card.rarity})</span>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Zone: {card.zone}</p>

                      <div className="absolute bottom-1 right-1 flex items-center space-x-1">
                          {!selectable && !onCardClickForGive && (
                             <Info className="w-3 h-3 text-muted-foreground/70 group-hover:text-accent" />
                          )}
                          {!selectable && onCardClickForGive && (
                              <Gift className="w-3 h-3 text-green-400/70 group-hover:text-green-400" title="Give this secret"/>
                          )}
                          {onDiscardCard && !selectable && (
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-destructive/70 hover:text-destructive hover:bg-destructive/10 p-0"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isSubmittingAction) onDiscardCard(cardRef); 
                                  }}
                                  disabled={isSubmittingAction}
                                  title={`Discard ${card.name}`}
                              >
                                  <Trash2 className="w-3 h-3" />
                              </Button>
                          )}
                      </div>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent>
                    <SecretCardTooltipContent card={card} />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
