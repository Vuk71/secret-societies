
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trophy } from 'lucide-react';

interface LeaderboardEntry {
  playerName: string;
  wins: number;
}

export function LeaderboardDisplay() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            throw new Error(`Failed to fetch leaderboard: ${response.statusText} (and error response was not JSON)`);
          }
          throw new Error(errorData.error || `Failed to fetch leaderboard: ${response.statusText}`);
        }
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        console.error("Error fetching leaderboard client-side:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setLeaderboard([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full max-w-lg mt-12">
        <CardHeader>
          <CardTitle className="flex items-center"><Trophy className="mr-2 text-accent" /> Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading leaderboard...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-lg mt-12">
        <CardHeader>
          <CardTitle className="flex items-center"><Trophy className="mr-2 text-accent" /> Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-destructive">Error loading leaderboard: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="w-full max-w-lg mt-12">
        <CardHeader>
          <CardTitle className="flex items-center"><Trophy className="mr-2 text-accent" /> Leaderboard</CardTitle>
          <CardDescription>Top players in Secret Societies</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No leaderboard data yet. Be the first to claim victory!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mt-12">
      <CardHeader>
        <CardTitle className="flex items-center"><Trophy className="mr-2 text-accent" /> Leaderboard</CardTitle>
        <CardDescription>Top players in Secret Societies</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Wins</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((entry, index) => (
              <TableRow key={entry.playerName}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>{entry.playerName}</TableCell>
                <TableCell className="text-right">{entry.wins}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
