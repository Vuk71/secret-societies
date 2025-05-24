
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function JoinGameForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [playerName, setPlayerName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !sessionId.trim()) {
      toast({
        title: "Validation Error",
        description: "Player name and Session ID are required to join a game.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    try {
      const response = await fetch(`/api/game/${sessionId.trim()}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            playerName: playerName.trim(),
            password: password // Send empty string if not set, API will handle it
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Use the error message from the server response
        throw new Error(responseData.error || `Server error: ${response.status}`);
      }

      const joinedPlayerId = responseData.playerId;

      toast({
        title: "Joined Game Successfully!",
        description: `Joining session ID: ${sessionId.trim()}.`,
      });

      // Navigate with joinedPlayerId as playerId and playerName
      router.push(`/game/${sessionId.trim()}?playerId=${joinedPlayerId}&playerName=${encodeURIComponent(playerName.trim())}`);

    } catch (error) {
      console.error("Failed to join game:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Error Joining Game",
        description: errorMessage, // Display the specific error from the server or a generic one
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Join Existing Game</CardTitle>
        <CardDescription>Enter the session details to join the courtly machinations.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="playerNameJoin">Your Name</Label>
            <Input
              id="playerNameJoin"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              required
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionId">Session ID</Label>
            <Input
              id="sessionId"
              placeholder="Enter the game's session ID"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              required
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwordJoin">Session Password (if any)</Label>
            <Input
              id="passwordJoin"
              type="password"
              placeholder="Enter session password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              spellCheck={false}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading || !playerName.trim() || !sessionId.trim()}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? "Joining..." : "Join Game"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
