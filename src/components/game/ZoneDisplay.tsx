
"use client";

import type { Zone, ZoneName } from "@/types/game";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ZoneDisplayProps {
  zones: Zone[];
  currentZone: ZoneName | null;
  onZoneSelect: (zoneName: ZoneName) => void;
  playerLocations: { playerId: string, zoneName: ZoneName, playerName: string }[];
  canMovePlayer: boolean;
  borderingZones: ZoneName[];
}

export function ZoneDisplay({ zones, currentZone, onZoneSelect, playerLocations, canMovePlayer, borderingZones }: ZoneDisplayProps) {
  
  const renderZoneCard = (zone: Zone | undefined, gridClasses: string) => {
    if (!zone) return <div className={cn(gridClasses, "h-28")}></div>; 

    const isCurrentPlayerZone = currentZone === zone.name;
    const isBordering = borderingZones.includes(zone.name);
    const isClickableForMove = canMovePlayer && (isCurrentPlayerZone || isBordering);

    const playersInThisZone = playerLocations.filter(pl => pl.zoneName === zone.name);

    let titleText = "" + zone.name;
    if (canMovePlayer) {
      if (isCurrentPlayerZone) titleText = `Stay in ${zone.name}`;
      else if (isBordering) titleText = `Move to ${zone.name}`;
      else titleText = `${zone.name} (Cannot move: Not a bordering zone)`;
    }

    return (
      <TooltipProvider key={zone.name} delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card
              className={cn(
                `p-3 md:p-2 transition-all duration-200 ease-in-out flex flex-col justify-center items-center relative h-28`,
                isCurrentPlayerZone ? 'border-accent ring-2 ring-accent shadow-accent/30' : 'border-border',
                isClickableForMove ? 'cursor-pointer hover:shadow-accent/50 hover:border-accent' : (canMovePlayer ? 'opacity-60 cursor-not-allowed' : 'cursor-default'),
                gridClasses
              )}
              title={titleText}
              onClick={(e) => {
                if (isClickableForMove) {
                  onZoneSelect(zone.name);
                }
              }}
              role={isClickableForMove ? "button" : "group"}
              tabIndex={isClickableForMove ? 0 : -1}
              onKeyDown={(e) => {
                if (isClickableForMove && (e.key === 'Enter' || e.key === ' ')) {
                  onZoneSelect(zone.name);
                }
              }}
            >
              <div className={cn("flex flex-col items-center text-center w-full pt-1 mb-1")}>
                <h3 className="text-sm md:text-base font-semibold text-primary-foreground flex items-center justify-center leading-tight">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2 text-accent shrink-0" />
                  {zone.name}
                </h3>
              </div>
              
              {playersInThisZone.length > 0 && (
                <div className="absolute top-1 right-1 p-1 bg-primary/30 rounded-full">
                  <Users className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-popover text-popover-foreground p-2 shadow-md rounded-md">
            {playersInThisZone.length > 0 ? (
              <ul className="list-none p-0 m-0 text-xs space-y-0.5">
                {playersInThisZone.map(pl => (
                  <li key={pl.playerId}>{pl.playerName}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No players currently in this zone.</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-primary-foreground">The King's Court</CardTitle>
        <CardDescription>
          Navigate the zones of power. Click a zone to move if it's your 'End of Turn' phase and a valid move.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-4 auto-rows-auto gap-1 md:gap-2 p-2 md:p-4">
        {/* Row 1 */}
        {renderZoneCard(undefined, "col-start-1 row-start-1 hidden md:block")}
        {renderZoneCard(zones.find(z => z.name === "Royal Chamber"), "col-start-2 col-span-2 row-start-1")}
        {renderZoneCard(undefined, "col-start-4 row-start-1 hidden md:block")}

        {/* Row 2 */}
        {renderZoneCard(zones.find(z => z.name === "Courtyard"), "col-span-2 row-start-2")}
        {renderZoneCard(zones.find(z => z.name === "Cathedral"), "col-span-2 row-start-2")}
        
        {/* Row 3 */}
        {renderZoneCard(zones.find(z => z.name === "Western Town Square"), "col-span-1 row-start-3")}
        {renderZoneCard(zones.find(z => z.name === "Trading Bailey"), "col-span-2 row-start-3")}
        {renderZoneCard(zones.find(z => z.name === "Eastern Town Square"), "col-span-1 row-start-3")}

        {/* Row 4 */}
        {renderZoneCard(zones.find(z => z.name === "Docks and Gates"), "col-span-4 row-start-4")}
      </CardContent>
    </Card>
  );
}
