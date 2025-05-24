
"use client";

import type { GameState } from "@/types/game";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CalendarDays, Info, Users, Send, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface GlobalStateDisplayProps {
  gameState: GameState;
  manualSuspicionInput: string;
  onManualSuspicionInputChange: (value: string) => void;
  onAdjustSuspicion: (amount: string) => void;
  manualMaxSuspicionAdjInput: string;
  onManualMaxSuspicionAdjInputChange: (value: string) => void;
  onAdjustMaxSuspicionAdjustment: (amount: string) => void; 
  isSubmittingAction: boolean;
  isInteractionDisabled?: boolean;
}

export function GlobalStateDisplay({
  gameState,
  manualSuspicionInput,
  onManualSuspicionInputChange,
  onAdjustSuspicion,
  manualMaxSuspicionAdjInput,
  onManualMaxSuspicionAdjInputChange,
  onAdjustMaxSuspicionAdjustment,
  isSubmittingAction,
  isInteractionDisabled = false,
}: GlobalStateDisplayProps) {
  const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-primary-foreground">Court Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span>Global Suspicion:</span>
          </div>
          <span className="font-bold text-red-400 text-lg">{gameState.suspicion}</span>
        </div>
         <div className="flex items-center space-x-2 py-1">
          <Input
            type="number"
            placeholder="+/- amount"
            value={manualSuspicionInput}
            onChange={(e) => onManualSuspicionInputChange(e.target.value)}
            className="h-8 text-sm flex-grow"
            disabled={isSubmittingAction || isInteractionDisabled}
            aria-label="Adjust Global Suspicion amount"
          />
          <Button
            size="sm"
            onClick={() => onAdjustSuspicion(manualSuspicionInput)}
            disabled={isSubmittingAction || isInteractionDisabled || manualSuspicionInput === "" || isNaN(parseInt(manualSuspicionInput,10))}
            className="h-8"
            aria-label="Submit Suspicion Adjustment"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-400" />
            <span>Max Suspicion Adj./Turn:</span>
          </div>
          <span className="font-bold text-orange-400 text-lg">{gameState.maxSuspicionAdjustment}</span>
        </div>
        <div className="flex items-center space-x-2 py-1">
        <Input
            type="number"
            placeholder="+/- amount"
            value={manualMaxSuspicionAdjInput}
            onChange={(e) => onManualMaxSuspicionAdjInputChange(e.target.value)}
            className="h-8 text-sm flex-grow"
            disabled={isSubmittingAction || isInteractionDisabled}
            aria-label="Adjust Max Suspicion Adjustment per turn"
        />
        <Button
            size="sm"
            onClick={() => onAdjustMaxSuspicionAdjustment(manualMaxSuspicionAdjInput)} 
            disabled={isSubmittingAction || isInteractionDisabled || manualMaxSuspicionAdjInput === "" || isNaN(parseInt(manualMaxSuspicionAdjInput,10))}
            className="h-8"
            aria-label="Submit Max Suspicion Adjustment Change"
        >
            <Send className="w-4 h-4" />
        </Button>
        </div>


        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-300" />
            <span>Current Round:</span>
          </div>
          <span className="font-bold text-blue-300 text-lg">{gameState.round}</span>
        </div>
         <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-300" />
            <span>Current Player:</span>
          </div>
          <span className="font-bold text-green-300">{currentPlayer?.name || 'N/A'}</span>
        </div>

        {gameState.activeEvent ? (
          <Card className="bg-card/50 border-accent/50">
            <CardHeader className="p-3">
              <CardTitle className="text-base text-accent">Active Event</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <h4 className="font-semibold">{gameState.activeEvent.name}</h4>
              <p className="text-xs text-muted-foreground">{gameState.activeEvent.description}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/50 border-muted-foreground/30">
             <CardHeader className="p-3"><CardTitle className="text-base text-muted-foreground">Active Event</CardTitle></CardHeader>
             <CardContent className="p-3 pt-0"><p className="text-sm font-semibold text-muted-foreground">No Event</p></CardContent>
          </Card>
        )}
        {gameState.upcomingEvent && (
          <Card className="bg-card/30 border-muted-foreground/30">
            <CardHeader className="p-3">
              <CardTitle className="text-base text-muted-foreground">Upcoming Event</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <h4 className="font-semibold">{gameState.upcomingEvent.name}</h4>
              <p className="text-xs text-muted-foreground">{gameState.upcomingEvent.description}</p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
