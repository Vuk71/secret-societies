
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateGameForm } from "@/components/session/CreateGameForm";
import { JoinGameForm } from "@/components/session/JoinGameForm";
import { Logo } from "@/components/icons/Logo";
import { LeaderboardDisplay } from "@/components/leaderboard/LeaderboardDisplay";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-center justify-center flex-grow w-full">
        <header className="mb-12 text-center">
          <Logo className="w-24 h-24 mx-auto mb-4 text-primary" />
          <h1 className="text-5xl font-bold tracking-tight text-primary-foreground">
            Secret Societies
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Weave your plots and seize power.
          </p>
        </header>

        <Tabs defaultValue="create" className="w-full max-w-lg">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Game</TabsTrigger>
            <TabsTrigger value="join">Join Game</TabsTrigger>
          </TabsList>
          <TabsContent value="create" className="mt-6">
            <CreateGameForm />
          </TabsContent>
          <TabsContent value="join" className="mt-6">
            <JoinGameForm />
          </TabsContent>
        </Tabs>

        <LeaderboardDisplay />

      </div>

      <footer className="mt-auto pt-16 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Secret Societies. All rights reserved.</p>
      </footer>
    </div>
  );
}
