
"use client";

import type { Zone, ZoneName } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface ZoneDisplayProps {
  zones: Zone[];
  currentZone: ZoneName | null;
  onZoneSelect: (zoneName: ZoneName) => void;
  playerLocations: { playerId: string, zoneName: ZoneName, playerName: string }[];
  canMovePlayer: boolean; 
  borderingZones: ZoneName[]; 
}

export function ZoneDisplay({ zones, currentZone, onZoneSelect, playerLocations, canMovePlayer, borderingZones }: ZoneDisplayProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-primary-foreground">The King's Court</CardTitle>
        <CardDescription>
          Navigate the zones of power. You can move once to a bordering zone during the 'End of Turn' phase, or choose to stay.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {zones.map((zone) => {
          const isCurrentPlayerZone = currentZone === zone.name;
          const isBordering = borderingZones.includes(zone.name);
          const showMoveButton = canMovePlayer && !isCurrentPlayerZone && isBordering;

          return (
            <Card 
              key={zone.name} 
              className={`p-4 transition-all duration-200 ease-in-out hover:shadow-accent/50 hover:border-accent
                ${isCurrentPlayerZone ? 'border-accent ring-2 ring-accent shadow-accent/30' : 'border-border'}
                ${playerLocations.some(pl => pl.zoneName === zone.name) ? 'bg-secondary/30' : ''}
                ${!isBordering && !isCurrentPlayerZone && canMovePlayer ? 'opacity-60' : ''} 
              `}
              title={!isBordering && !isCurrentPlayerZone && canMovePlayer ? "Cannot move: Not a bordering zone" : zone.name}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-primary-foreground flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-accent" />
                  {zone.name}
                </h3>
                {showMoveButton && (
                   <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onZoneSelect(zone.name)}
                      title={`Move to ${zone.name}`}
                    >
                     Move Here
                   </Button>
                )}
              </div>
              {/* Removed explicit borders list: <p className="text-xs text-muted-foreground mb-1">Borders: {zone.borders.join(", ")}</p> */}
              <div className="mt-2 space-y-1">
                {playerLocations.filter(pl => pl.zoneName === zone.name).map(pl => (
                  <div key={pl.playerId} className="text-xs px-2 py-1 bg-primary/20 text-primary-foreground rounded-md">
                    {pl.playerName} is here.
                  </div>
                ))}
              </div>
               {isCurrentPlayerZone && canMovePlayer && (
                 <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => onZoneSelect(zone.name)} // Clicking current zone means "stay"
                    title={`Stay in ${zone.name}`}
                  >
                   Stay in Current Zone
                 </Button>
               )}
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
