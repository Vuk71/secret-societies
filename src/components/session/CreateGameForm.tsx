
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function CreateGameForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [hostNameInput, setHostNameInput] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("CreateGameForm handleSubmit called");
    e.preventDefault();
    setIsLoading(true);

    const currentHostName = hostNameInput.trim();

    if (!currentHostName) {
      toast({
        title: "Validation Error",
        description: "Please enter your name as the host.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    console.log("Attempting to create lobby with hostName:", currentHostName, "Password:", password ? "Yes" : "No");

    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: currentHostName, password }),
      });
      console.log("Response from /api/game/create:", response);


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from server." }));
        console.error("Error creating lobby (client-side):", errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const { sessionId, hostPlayerId, hostName: returnedHostName } = await response.json();
      console.log("Lobby created successfully (client-side):", { sessionId, hostPlayerId, returnedHostName });


      toast({
        title: "Game Lobby Created!",
        description: `Session ID: ${sessionId}. Share this ID with other players. Redirecting to lobby...`,
      });

      // Navigate with hostPlayerId as playerId and hostName as playerName
      // Also pass isHost=true for clearer client-side host identification if needed,
      // though primary host identification should be derived from game state (first player).
      router.push(`/game/${sessionId}?playerId=${hostPlayerId}&playerName=${encodeURIComponent(returnedHostName)}&isHost=true`);

    } catch (error) {
      console.error("Failed to create game lobby in handleSubmit catch:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Error Creating Lobby",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-xl"> {/* Removed max-w-md */}
      <CardHeader>
        <CardTitle>Create New Game Lobby</CardTitle>
        <CardDescription>Enter your name as host and an optional password.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="hostNameInput">Your Name (Host)</Label>
            <Input
              id="hostNameInput"
              placeholder="Enter your name"
              value={hostNameInput}
              onChange={(e) => setHostNameInput(e.target.value)}
              required
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordCreate">Session Password (Optional)</Label>
            <Input
              id="passwordCreate"
              type="password"
              placeholder="Choose a password for players to join"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              spellCheck={false}
            />
             <p className="text-xs text-muted-foreground">If set, players will need this password to join your lobby.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading || !hostNameInput.trim()}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? "Creating Lobby..." : "Create Lobby"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
