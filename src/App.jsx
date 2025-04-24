import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NameAndGame from "./NameAndGame";
import KortTabFirebase from "./KortTabFirebase";
import RulesTab from "./RulesTab";
import RegissorTab from "./RegissorTab";
import ScenekortTab from "./ScenekortTab";
import { db } from './firebaseConfig';
import { ref, get, set, onValue } from 'firebase/database';
import { fetchSceneCards, fetchDramaCards } from './utils/sheetsConfig';

export default function AvgrunnenApp() {
  const [ready, setReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPlayerRegistered, setIsPlayerRegistered] = useState(false);
  const [error, setError] = useState(null);

  // Initialize game data if needed
  const initializeGameData = async (gameId) => {
    try {
      setIsInitializing(true);
      setError(null);
      console.log('🎲 Starting game initialization...');
      
      // First, ensure player is registered
      const name = localStorage.getItem("name");
      const character = localStorage.getItem("character");
      if (!name) {
        throw new Error('No player name found');
      }

      const playerRef = ref(db, `games/${gameId}/players/${name}`);
      const playerSnap = await get(playerRef);
      
      if (!playerSnap.exists()) {
        await set(playerRef, {
          character: character || name,
          joinedAt: Date.now()
        });
        console.log('🎭 Registered player:', name);
      }
      setIsPlayerRegistered(true);
      
      // Then initialize game if needed
      const gameRef = ref(db, `games/${gameId}`);
      const gameSnap = await get(gameRef);
      
      if (!gameSnap.exists()) {
        console.log('🆕 Creating new game...');
        // Initialize drama cards
        const dramaCards = await fetchDramaCards();
        if (dramaCards.length === 0) throw new Error('No drama cards found');
        console.log('📥 Fetched drama cards:', dramaCards.length);
        
        // Initialize scene cards
        const sceneCards = await fetchSceneCards();
        if (sceneCards.length === 0) throw new Error('No scene cards found');
        console.log('🎬 Fetched scene cards:', sceneCards.length);
        
        // Set up initial game state
        await set(gameRef, {
          cards: dramaCards,
          sceneCards: {
            cards: sceneCards,
            hands: {}
          },
          hands: {},
          discard: [],
          played: {},
          players: {
            [name]: {
              character: character || name,
              joinedAt: Date.now()
            }
          }
        });
        console.log('✅ Game initialized successfully');
      }

      return true;
    } catch (err) {
      console.error('Failed to initialize game:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsInitializing(false);
    }
  };

  // Monitor player registration status
  useEffect(() => {
    const name = localStorage.getItem("name");
    const gameId = localStorage.getItem("gameId");
    
    if (!name || !gameId) {
      setIsPlayerRegistered(false);
      return;
    }

    const playerRef = ref(db, `games/${gameId}/players/${name}`);
    const unsubscribe = onValue(playerRef, (snapshot) => {
      const isRegistered = snapshot.exists();
      console.log('👤 Player registration status:', isRegistered ? 'Registered' : 'Not registered');
      setIsPlayerRegistered(isRegistered);
    });

    return () => unsubscribe();
  }, []);

  // Handle initial load
  useEffect(() => {
    const name = localStorage.getItem("name");
    const gameId = localStorage.getItem("gameId");
    console.log("📝 Loading from localStorage:", { name, gameId });
    
    if (!name || !gameId) {
      console.log('⏳ Waiting for name and gameId...');
      return;
    }

    initializeGameData(gameId)
      .then(() => {
        console.log('🎮 Game ready');
        setReady(true);
      })
      .catch((err) => {
        console.error('❌ Initialization failed:', err);
        setError(err.message);
        localStorage.clear();
        window.location.reload();
      });
  }, []);

  const handleSubmit = async ({ name, gameId }) => {
    try {
      setError(null);
      localStorage.setItem("name", name);
      localStorage.setItem("gameId", gameId);
      await initializeGameData(gameId);
      setReady(true);
    } catch (err) {
      console.error('Failed to initialize game:', err);
      setError('Kunne ikke koble til spillet. Prøv igjen.');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#e8f0ea] text-gray-900 font-sans flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Prøv igjen
          </Button>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#e8f0ea] text-gray-900 font-sans flex items-center justify-center">
        <div className="text-center">
          <p className="mb-2">Initialiserer spill...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e8f0ea] text-gray-900 font-sans pb-20">
      {!ready ? (
        <NameAndGame onSubmit={handleSubmit} />
      ) : (
        <Tabs defaultValue="dramakort" className="w-full max-w-md mx-auto p-4">
          <TabsContent value="dramakort">
            <KortTabFirebase />
          </TabsContent>

          <TabsContent value="scenekort" className="mt-4">
            {isPlayerRegistered ? (
              <ScenekortTab />
            ) : (
              <div className="text-center p-4">
                <p>Venter på spillerregistrering...</p>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mt-2"></div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="kart" className="mt-4">
            <div className="text-center">
              <p className="mb-2">Lokasjoner (eks):</p>
              <ul className="list-disc list-inside">
                <li>Det forlatte hotellet</li>
                <li>Tårnet i skogen</li>
                <li>Den sunkne byen</li>
              </ul>
              <img src="/map-placeholder.png" alt="Kart" className="mt-4 w-full rounded" />
            </div>
          </TabsContent>

          <TabsContent value="regler" className="mt-4">
            <RulesTab />
          </TabsContent>

          <TabsContent value="roller" className="mt-4">
            <div className="text-center">
              <p className="mb-2">Roller (eksempel):</p>
              <Card className="mb-2"><CardContent className="p-4">Rolle 1: Maria, kultist</CardContent></Card>
              <Card className="mb-2"><CardContent className="p-4">Rolle 2: Johan, etterforsker</CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="regissor" className="mt-4">
            <RegissorTab />
          </TabsContent>

          <TabsList className="fixed bottom-0 left-0 right-0 flex justify-around bg-white border-t shadow-md">
            <TabsTrigger value="dramakort">Dramakort</TabsTrigger>
            <TabsTrigger value="scenekort">Scenekort</TabsTrigger>
            <TabsTrigger value="kart">Kart</TabsTrigger>
            <TabsTrigger value="regler">Regler</TabsTrigger>
            <TabsTrigger value="roller">Roller</TabsTrigger>
            <TabsTrigger value="regissor">Regissør</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}
