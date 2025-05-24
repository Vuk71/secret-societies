
"use client";

import type { Player, PlayerResourceType } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, ShieldCheck, Scroll, EyeOff, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface PlayerResourcesDisplayProps {
  player: Player;
  manualInputs: { [key in PlayerResourceType]?: string };
  onManualInputChange: (resource: PlayerResourceType, value: string) => void;
  onAdjustResource: (resource: PlayerResourceType) => void;
  isSubmittingAction: boolean;
}

const ResourceItem: React.FC<{ 
  icon: React.ElementType; 
  label: string; 
  value: number | string; 
  colorClass: string;
  resourceType: PlayerResourceType;
  inputValue: string;
  onInputChange: (value: string) => void;
  onAdjust: () => void;
  isSubmitting: boolean;
}> = ({ icon: Icon, label, value, colorClass, resourceType, inputValue, onInputChange, onAdjust, isSubmitting }) => (
  <div className="py-2 px-1 border-b border-border/50 last:border-b-0">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center space-x-3">
        <Icon className={`w-6 h-6 ${colorClass}`} />
        <span className="font-medium text-base">{label}</span>
      </div>
      <span className={`font-semibold text-lg ${colorClass}`}>{value}</span>
    </div>
    <div className="flex items-center space-x-2">
      <Input 
        type="number" 
        placeholder={`+/- amount`}
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        className="h-8 text-sm flex-grow"
        disabled={isSubmitting}
        aria-label={`Adjust ${label} amount`}
      />
      <Button 
        size="sm" 
        onClick={onAdjust} 
        disabled={isSubmitting || inputValue === "" || isNaN(parseInt(inputValue,10))}
        className="h-8"
        aria-label={`Submit ${label} Adjustment`}
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

export function PlayerResourcesDisplay({ 
    player, 
    manualInputs = {}, 
    onManualInputChange, 
    onAdjustResource,
    isSubmittingAction
}: PlayerResourcesDisplayProps) {
  const resources: { type: PlayerResourceType; label: string; icon: React.ElementType; color: string }[] = [
    { type: "gold", label: "Gold", icon: Coins, color: "text-accent" },
    { type: "trust", label: "Trust", icon: ShieldCheck, color: "text-green-400" },
    { type: "information", label: "Information", icon: Scroll, color: "text-blue-400" },
    { type: "secrecy", label: "Secrecy", icon: EyeOff, color: "text-purple-400" },
  ];

  if (!player) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-primary-foreground">Player Resources</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-muted-foreground">Loading player data...</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-primary-foreground">Your Resources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-4">
        {resources.map(res => (
          <ResourceItem
            key={res.type}
            icon={res.icon}
            label={res.label}
            value={player[res.type]}
            colorClass={res.color}
            resourceType={res.type}
            inputValue={manualInputs[res.type] || ""}
            onInputChange={(val) => onManualInputChange(res.type, val)}
            onAdjust={() => onAdjustResource(res.type)}
            isSubmitting={isSubmittingAction}
          />
        ))}
      </CardContent>
    </Card>
  );
}
