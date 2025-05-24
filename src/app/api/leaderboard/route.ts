
import { NextResponse } from 'next/server';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: Request) {
  try {
    const playerStatsRef = collection(db, 'playerStats');
    // Query to order by wins in descending order and limit to top 10 (or adjust as needed)
    const q = query(playerStatsRef, orderBy('wins', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);

    const leaderboard: { playerName: string, wins: number }[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      leaderboard.push({
        playerName: data.playerName || doc.id, // Use playerName field, fallback to doc.id if not present
        wins: data.wins || 0,
      });
    });

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('[API LEADERBOARD GET] Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
