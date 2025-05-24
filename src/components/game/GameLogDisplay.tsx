
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookText } from "lucide-react";

interface GameLogDisplayProps {
  logs: string[];
}

export function GameLogDisplay({ logs }: GameLogDisplayProps) {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg text-primary-foreground flex items-center">
          <BookText className="w-5 h-5 mr-2 text-accent" />
          Game Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-60 w-full p-4">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No game events yet.</p>
          ) : (
            <ul className="space-y-1">
              {logs.map((log, index) => ( // Removed .slice().reverse()
                <li key={index} className="text-xs text-muted-foreground">
                  {log}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
