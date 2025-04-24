import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NameAndGame from "./NameAndGame";
import KortTabFirebase from "./KortTabFirebase";
import RulesTab from "./RulesTab";
import RegissorTab from "./RegissorTab";
import ScenekortTab from "./ScenekortTab";
import RollerTab from "./RollerTab";
import { db } from './firebaseConfig';
import { ref, get, set, onValue, runTransaction } from 'firebase/database';
import { fetchSceneCards, fetchDramaCards, testSheetAccess } from './utils/sheetsConfig';

export default function AvgrunnenApp() {
  const [ready, setReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPlayerRegistered, setIsPlayerRegistered] = useState(false);
  const [error, setError] = useState(null);
  const [gameState, setGameState] = useState(null);

  // Initialize game data if needed
  const initializeGameData = async (gameId) => {
    try {
      setIsInitializing(true);
      setError(null);
      console.log('🎲 Starting game initialization...');
      
      // Test sheet access first
      console.log('🔍 Testing sheet accessibility...');
      const sheetTest = await testSheetAccess();
      console.log('📊 Sheet test results:', sheetTest);
      
      if (sheetTest.error) {
        throw new Error(`Sheet access test failed: ${sheetTest.error}`);
      }
      
      if (!sheetTest.dramaOk || !sheetTest.sceneOk) {
        throw new Error('One or both sheets are not accessible');
      }
      
      // First, ensure player is registered
      const name = localStorage.getItem("name");
      const character = localStorage.getItem("character");
      if (!name) {
        throw new Error('No player name found');
      }

      // Initialize game if needed first
      const gameRef = ref(db, `games/${gameId}`);
      const gameSnap = await get(gameRef);
      console.log('🔍 Current game state:', gameSnap.val());
      
      if (!gameSnap.exists()) {
        console.log('🆕 Creating new game...');
        // Initialize drama cards
        console.log('🎭 Fetching drama cards...');
        const dramaCards = await fetchDramaCards();
        console.log('🎭 Fetched drama cards:', dramaCards);
        if (dramaCards.length === 0) throw new Error('No drama cards found');
        console.log('📥 Fetched drama cards:', dramaCards.length);
        
        // Initialize scene cards
        console.log('🎬 Fetching scene cards...');
        const sceneCards = await fetchSceneCards();
        console.log('🎬 Fetched scene cards:', sceneCards);
        if (sceneCards.length === 0) throw new Error('No scene cards found');
        console.log('🎬 Fetched scene cards:', sceneCards.length);
        
        // Set up initial game state
        const initialState = {
          dramaCards: {
            cards: dramaCards,
            hands: {},
            played: {}
          },
          sceneCards: {
            cards: sceneCards,
            hands: {}
          },
          players: {}
        };
        
        console.log('💾 Setting initial game state:', initialState);
        await set(gameRef, initialState);
        console.log('✅ Game initialized successfully');
      } else {
        // If game exists but has old structure, migrate it
        const game = gameSnap.val();
        if (game.cards && !game.dramaCards) {
          console.log('�� Migrating old game structure to new format...');
          const updatedGame = {
            ...game,
            dramaCards: {
              cards: game.cards,
              hands: game.hands || {},
              played: game.played || {}
            }
          };
          // Remove old fields
          delete updatedGame.cards;
          delete updatedGame.hands;
          delete updatedGame.played;
          
          await set(gameRef, updatedGame);
          console.log('✅ Game structure migration complete');
        }
      }

      // Then register player
      console.log('👤 Registering player:', name);
      const playerRef = ref(db, `games/${gameId}/players/${name}`);
      await runTransaction(playerRef, (currentData) => {
        console.log('👤 Current player data:', currentData);
        if (currentData === null) {
          return {
            character: character || name,
            joinedAt: Date.now(),
            initialized: true
          };
        }
        // If player exists, mark as initialized
        return {
          ...currentData,
          initialized: true
        };
      });
      console.log('🎭 Player registration complete:', name);

      // Initialize hands if needed
      console.log('🎴 Initializing player hands...');
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        console.log('🔍 Current game state for hand initialization:', game);
        if (!game) return game;

        // Ensure drama cards hand exists
        if (!game.dramaCards?.hands?.[name]) {
          console.log('🎭 Creating drama cards hand for player');
          game.dramaCards = {
            ...game.dramaCards,
            hands: {
              ...game.dramaCards?.hands,
              [name]: []
            }
          };
        }

        // Ensure scene cards hand exists
        if (!game.sceneCards?.hands?.[name]) {
          console.log('🎬 Creating scene cards hand for player');
          game.sceneCards = {
            ...game.sceneCards,
            hands: {
              ...game.sceneCards?.hands,
              [name]: []
            }
          };
        }

        console.log('✅ Updated game state:', game);
        return game;
      });
      
      // Set registration status after successful registration
      setIsPlayerRegistered(true);
      console.log('✨ Game initialization complete');
      return true;
    } catch (err) {
      console.error('❌ Failed to initialize game:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsInitializing(false);
    }
  };

  // Monitor game state
  useEffect(() => {
    const name = localStorage.getItem("name");
    const gameId = localStorage.getItem("gameId");
    
    if (!name || !gameId) return;

    console.log('👀 Monitoring game state');
    const gameRef = ref(db, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const game = snapshot.val();
      if (game) {
        setGameState(game);
      }
    });

    return () => unsubscribe();
  }, []);

  // Monitor player registration status
  useEffect(() => {
    const name = localStorage.getItem("name");
    const gameId = localStorage.getItem("gameId");
    
    if (!name || !gameId) {
      setIsPlayerRegistered(false);
      return;
    }

    console.log('👀 Monitoring player registration for:', name);
    const playerRef = ref(db, `games/${gameId}/players/${name}`);
    const unsubscribe = onValue(playerRef, (snapshot) => {
      const player = snapshot.val();
      const isRegistered = player?.initialized === true;
      console.log('👤 Player registration status:', isRegistered ? 'Registered' : 'Not registered');
      setIsPlayerRegistered(isRegistered);
    });

    return () => unsubscribe();
  }, []);

  // Handle initial load
  useEffect(() => {
    const name = localStorage.getItem("name");
    const gameId = localStorage.getItem("gameId");
    console.log("📝 Initial load check:", { name, gameId });
    
    if (!name || !gameId) {
      console.log('⏳ Waiting for name and gameId...');
      return;
    }

    // Ensure game is initialized and player is registered
    initializeGameData(gameId)
      .then(() => {
        console.log('🎮 Game and player ready');
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
      setReady(false);
      setIsPlayerRegistered(false);
      setGameState(null);
      
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
            <KortTabFirebase gameState={gameState} />
          </TabsContent>

          <TabsContent value="scenekort" className="mt-4">
            {isPlayerRegistered ? (
              <ScenekortTab gameState={gameState} />
            ) : (
              <div className="text-center p-4">
                <p>Venter på spillerregistrering...</p>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mt-2"></div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="regler" className="mt-4">
            <RulesTab />
          </TabsContent>

          <TabsContent value="roller" className="mt-4">
            {isPlayerRegistered ? (
              <RollerTab gameState={gameState} />
            ) : (
              <div className="text-center p-4">
                <p>Venter på spillerregistrering...</p>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mt-2"></div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="regissor" className="mt-4">
            <RegissorTab />
          </TabsContent>

          <TabsList className="fixed bottom-0 left-0 right-0 flex justify-around bg-white border-t shadow-md">
            <TabsTrigger value="dramakort">Dramakort</TabsTrigger>
            <TabsTrigger value="scenekort">Scenekort</TabsTrigger>
            <TabsTrigger value="regler">Regler</TabsTrigger>
            <TabsTrigger value="roller">Roller</TabsTrigger>
            <TabsTrigger value="regissor">Regissør</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}
